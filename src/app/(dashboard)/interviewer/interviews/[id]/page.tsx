import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StartInterviewButton from "./StartInterviewButton";
import CompleteInterviewForm from "./CompleteInterviewForm";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";

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

  const campaignType = interview.candidate.campaign?.type;
  const isExperienced = campaignType === "experienced";
  const feedbackResult = interview.feedback?.result;
  let feedbackVariant: "hire" | "no_hire" | "weak_hire" | "no_show" | undefined;
  if (feedbackResult === "HIRE") feedbackVariant = "hire";
  else if (feedbackResult === "NO_HIRE") feedbackVariant = "no_hire";
  else if (feedbackResult === "WEAK_HIRE") feedbackVariant = "weak_hire";
  else if (feedbackResult === "NO_SHOW") feedbackVariant = "no_show";

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href="/interviewer/interviews" className="text-sm text-primary hover:text-primary-hover transition-colors">
        ← My interviews
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">Interview: {interview.candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">
            {interview.candidate.email} · {interview.candidate.campaign?.name}
          </p>
          {interview.candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {interview.candidate.phone}</p>}
          {!isExperienced && interview.candidate.college && <p className="text-sm text-foreground-secondary">College: {interview.candidate.college}</p>}
          {!isExperienced && interview.candidate.department && <p className="text-sm text-foreground-secondary">Department: {interview.candidate.department}</p>}
          {interview.candidate.resumeLink && (
            <p className="text-sm">
              Resume:{" "}
              <a href={interview.candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                Open link
              </a>
            </p>
          )}
          <p className="text-sm text-foreground-secondary mt-2">
            Scheduled: {new Date(interview.scheduledAt).toLocaleString()} ·{" "}
            <StatusBadge variant={interview.status as any} />
          </p>
        </div>
      </div>

      {interview.candidate.interviews.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
          <ul className="space-y-3">
            {interview.candidate.interviews.map((i) => (
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
        <CompleteInterviewForm interviewId={interview.id} campaignType={campaignType} />
      )}

      {interview.status === "completed" && interview.feedback && (
        <div className="border border-border rounded-xl p-6 bg-card text-foreground">
          <h2 className="text-xl font-bold mb-3 tracking-tight">Your Feedback</h2>
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
    </div>
  );
}
