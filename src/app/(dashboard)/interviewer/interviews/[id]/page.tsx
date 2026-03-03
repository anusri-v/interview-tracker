import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StartInterviewButton from "./StartInterviewButton";
import CompleteInterviewForm from "./CompleteInterviewForm";
import EditFeedbackForm from "./EditFeedbackForm";
import InterviewTimer from "./InterviewTimer";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";
import AutoRefresh from "@/components/ui/AutoRefresh";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: {
        include: {
          campaign: { select: { name: true, type: true } },
          interviews: {
            where: { status: "completed" },
            include: {
              feedback: true,
              interviewer: { select: { name: true, email: true } },
            },
            orderBy: { completedAt: "asc" },
          },
        },
      },
      feedback: true,
    },
  });

  if (!interview || interview.interviewerId !== session.user.id) notFound();

  // Check if a next round interview was ever assigned after this interview's completion
  const nextRoundAssigned = interview.status === "completed" && interview.completedAt
    ? await prisma.interview.count({
        where: {
          candidateId: interview.candidateId,
          createdAt: { gt: interview.completedAt },
        },
      }).then((count) => count > 0)
    : false;

  const campaignType = interview.candidate.campaign?.type;
  const isLateral = campaignType === "lateral";
  const feedbackResult = interview.feedback?.result;
  const canEditFeedback =
    interview.status === "completed" &&
    interview.feedback?.result === "WEAK_HIRE" &&
    !nextRoundAssigned;

  let feedbackVariant: "hire" | "no_hire" | "weak_hire" | "no_show" | undefined;
  if (feedbackResult === "HIRE") feedbackVariant = "hire";
  else if (feedbackResult === "NO_HIRE") feedbackVariant = "no_hire";
  else if (feedbackResult === "WEAK_HIRE") feedbackVariant = "weak_hire";
  else if (feedbackResult === "NO_SHOW") feedbackVariant = "no_show";

  // Panel data
  let panelMembers: { id: string; name: string; email: string; isCurrentUser: boolean }[] = [];
  let panelFeedbackSubmitter: string | null = null;
  let panelFeedbackAlreadySubmitted = false;

  if (interview.panelGroupId) {
    const siblingInterviews = await prisma.interview.findMany({
      where: { panelGroupId: interview.panelGroupId },
      include: { interviewer: { select: { id: true, name: true, email: true } } },
    });
    panelMembers = siblingInterviews.map((si) => ({
      id: si.interviewer.id,
      name: si.interviewer.name || si.interviewer.email,
      email: si.interviewer.email,
      isCurrentUser: si.interviewer.id === session.user.id,
    }));

    const panelFeedback = await prisma.panelFeedback.findUnique({
      where: { panelGroupId: interview.panelGroupId },
      include: { submittedBy: { select: { name: true, email: true } } },
    });
    if (panelFeedback) {
      panelFeedbackAlreadySubmitted = true;
      panelFeedbackSubmitter = panelFeedback.submittedBy.name || panelFeedback.submittedBy.email;
    }
  }

  // Filter out current panel interviews from past feedbacks display
  const pastInterviews = interview.candidate.interviews.filter((i) => {
    if (interview.panelGroupId && i.id !== interview.id) {
      // Don't show sibling panel interviews as separate past interviews
      return false;
    }
    return i.id !== interview.id;
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <AutoRefresh />
      <Link href="/interviewer/interviews" className="text-sm text-primary hover:text-primary-hover transition-colors">
        &larr; My interviews
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">Interview: {interview.candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">
            {interview.candidate.email} &middot; {interview.candidate.campaign?.name}
          </p>
          {interview.candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {interview.candidate.phone}</p>}
          {!isLateral && interview.candidate.college && <p className="text-sm text-foreground-secondary">College: {interview.candidate.college}</p>}
          {!isLateral && interview.candidate.department && <p className="text-sm text-foreground-secondary">Department: {interview.candidate.department}</p>}
          {interview.candidate.resumeLink && (
            <p className="text-sm">
              Resume:{" "}
              <a href={interview.candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                Open link
              </a>
            </p>
          )}
          <p className="text-sm text-foreground-secondary mt-2">
            Scheduled: {new Date(interview.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} &middot;{" "}
            <StatusBadge variant={interview.status as any} />
          </p>
        </div>
      </div>

      {/* Panel Members */}
      {panelMembers.length > 0 && (
        <div className="border border-border rounded-xl bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Panel Members</h2>
          <div className="flex flex-wrap gap-2">
            {panelMembers.map((m) => (
              <span
                key={m.id}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m.isCurrentUser
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-surface text-foreground-secondary border border-border"
                }`}
              >
                {m.name}{m.isCurrentUser ? " (you)" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {pastInterviews.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
          <ul className="space-y-3">
            {pastInterviews.map((i) => (
              <li key={i.id} className="border border-border rounded-xl bg-card p-4 text-sm text-foreground">
                <p className="font-medium">{i.interviewer.name ?? i.interviewer.email}</p>
                {i.feedback && (
                  <>
                    <p className="mt-2">
                      <span className="font-medium">Result: </span>
                      <StatusBadge variant={i.feedback.result.toLowerCase() as any} />
                    </p>
                    <p className="mt-2 text-foreground-secondary">{i.feedback.feedback}</p>
                    <SkillRatingsDisplay skillRatings={i.feedback.skillRatings} />
                    {i.feedback.pointersForNextInterviewer && (
                      <p className="mt-1 text-foreground-muted">Pointers: {i.feedback.pointersForNextInterviewer}</p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {interview.status === "scheduled" && (
        <StartInterviewButton interviewId={interview.id} />
      )}

      {interview.status === "ongoing" && (
        <>
          {interview.startedAt && (
            <InterviewTimer startedAt={interview.startedAt.toISOString()} />
          )}
          {panelFeedbackAlreadySubmitted ? (
            <div className="border border-border rounded-xl p-6 bg-card text-foreground">
              <p className="text-sm text-foreground-muted">
                Feedback already submitted by <strong>{panelFeedbackSubmitter}</strong>
              </p>
            </div>
          ) : (
            <CompleteInterviewForm interviewId={interview.id} campaignType={campaignType} />
          )}
        </>
      )}

      {interview.status === "completed" && interview.feedback && (
        <div className="border border-border rounded-xl p-6 bg-card text-foreground">
          <h2 className="text-xl font-bold mb-3 tracking-tight">
            {panelMembers.length > 0 ? "Panel Feedback" : "Your Feedback"}
          </h2>
          {panelFeedbackSubmitter && (
            <p className="text-xs text-foreground-muted mb-2">Submitted by {panelFeedbackSubmitter}</p>
          )}
          <p className="text-sm">
            <span className="font-medium">Result: </span>
            {feedbackVariant && <StatusBadge variant={feedbackVariant} />}
          </p>
          <p className="text-sm mt-3 text-foreground-secondary">{interview.feedback.feedback}</p>
          <SkillRatingsDisplay skillRatings={interview.feedback.skillRatings} />
          {interview.feedback.pointersForNextInterviewer && (
            <p className="text-sm mt-2 text-foreground-muted">
              Pointers for next: {interview.feedback.pointersForNextInterviewer}
            </p>
          )}
        </div>
      )}

      {canEditFeedback && !panelMembers.length && interview.feedback && (
        <EditFeedbackForm
          interviewId={interview.id}
          currentResult={interview.feedback.result}
          currentFeedback={interview.feedback.feedback ?? ""}
          currentPointers={interview.feedback.pointersForNextInterviewer}
          currentSkillRatings={
            Array.isArray(interview.feedback.skillRatings)
              ? (interview.feedback.skillRatings as Array<{ skill: string; rating: number }>)
              : []
          }
        />
      )}
    </div>
  );
}
