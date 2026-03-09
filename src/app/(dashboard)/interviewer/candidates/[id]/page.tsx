import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import FeedbackList from "@/app/(dashboard)/admin/candidates/[id]/details/FeedbackList";
import AutoRefresh from "@/components/ui/AutoRefresh";

export default async function InterviewerCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true, type: true } },
      interviews: {
        include: {
          feedback: true,
          interviewer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!candidate) notFound();

  const allInterviews = candidate.interviews;

  const isAdmin = session.user.role === "admin";
  const isLateral = candidate.campaign?.type === "lateral";

  const completedInterviews = allInterviews.filter((i) => i.status === "completed");

  const interviewsData = completedInterviews.map((i) => {
    const panelSiblingNames = i.panelGroupId
      ? completedInterviews
          .filter((s) => s.panelGroupId === i.panelGroupId && s.id !== i.id)
          .map((s) => s.interviewer.name ?? s.interviewer.email)
      : [];
    return {
      id: i.id,
      interviewerId: i.interviewerId,
      interviewerName: i.interviewer.name ?? i.interviewer.email,
      completedAt: i.completedAt?.toISOString() ?? null,
      result: i.feedback?.result ?? null,
      feedbackText: i.feedback?.feedback ?? null,
      pointers: i.feedback?.pointersForNextInterviewer ?? null,
      skillRatings: Array.isArray(i.feedback?.skillRatings)
        ? (i.feedback!.skillRatings as Array<{ skill: string; rating: number }>)
        : [],
      nextRoundAssigned: i.completedAt
        ? allInterviews.some((other) => other.createdAt > i.completedAt!)
        : false,
      panelGroupId: i.panelGroupId ?? null,
      panelSiblingNames,
    };
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <AutoRefresh />
      <Link href={`/interviewer/campaigns/${candidate.campaignId}/candidates`} className="text-sm text-primary hover:text-primary-hover transition-colors">
        &larr; Back to candidates
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>}
          {!isLateral && candidate.college && <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>}
          {!isLateral && candidate.department && <p className="text-sm text-foreground-secondary">Department: {candidate.department}</p>}
          {candidate.resumeLink && (
            <p className="text-sm">
              Resume:{" "}
              <a href={candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                Open link
              </a>
            </p>
          )}
          <p className="text-sm text-foreground-secondary">Campaign: {candidate.campaign?.name}</p>
          <p className="text-sm text-foreground-secondary">Status: {candidate.status}</p>
          {candidate.currentRole && <p className="text-sm text-foreground-secondary">Current Role: {candidate.currentRole}</p>}
          {candidate.hiredRole && <p className="text-sm text-foreground-secondary">Hired Role: {candidate.hiredRole}</p>}
          {isLateral && candidate.company && (
            <p className="text-sm text-foreground-secondary">Company: {candidate.company}</p>
          )}
          {isLateral && candidate.yearsOfExperience != null && (
            <p className="text-sm text-foreground-secondary">Years of Experience: {candidate.yearsOfExperience}</p>
          )}
          {isLateral && candidate.location && (
            <p className="text-sm text-foreground-secondary">Location: {candidate.location}</p>
          )}
          {isLateral && candidate.dateFirstSpoken && (
            <p className="text-sm text-foreground-secondary">
              Date First Spoken: {new Date(candidate.dateFirstSpoken).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {isAdmin && isLateral && candidate.source && (
            <p className="text-sm text-foreground-secondary">
              Source: {candidate.source}{candidate.sourceDetail ? ` — ${candidate.sourceDetail}` : ""}
            </p>
          )}
          {isAdmin && isLateral && candidate.currentCtc && (
            <p className="text-sm text-foreground-secondary">Current CTC: {candidate.currentCtc}</p>
          )}
          {isAdmin && isLateral && candidate.expectedCtc && (
            <p className="text-sm text-foreground-secondary">Expected CTC: {candidate.expectedCtc}</p>
          )}
        </div>
      </div>

      {/* Drop Reason Banner */}
      {candidate.status === "dropped" && candidate.dropReason && (
        <div className="border border-danger/30 bg-red-50 dark:bg-red-950/20 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-danger">Dropped</p>
            <p className="text-sm text-foreground-secondary mt-0.5">{candidate.dropReason}</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
        <FeedbackList
          candidateName={candidate.name}
          interviews={interviewsData}
          currentUserId={session.user.id}
        />
      </section>
    </div>
  );
}
