import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import StatusBadge from "@/components/ui/StatusBadge";
import AutoRefresh from "@/components/ui/AutoRefresh";
import ReincludeButton from "./ReincludeButton";
import FeedbackList from "./FeedbackList";

export const dynamic = "force-dynamic";

async function reincludeInPipeline(candidateId: string) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { status: true, id: true } } },
  });
  if (!candidate || candidate.status !== "rejected") return;
  if (candidate.campaign.status === "completed") return;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "in_pipeline" },
  });
  await auditLog({
    userId: session.user.id,
    action: "candidate.reinclude",
    entityType: "Candidate",
    entityId: candidateId,
    metadata: { campaignId: candidate.campaignId },
  });
  revalidatePath(`/admin/candidates/${candidateId}/details`);
}

export default async function CandidateDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true, status: true, type: true } },
      interviews: {
        include: {
          feedback: true,
          interviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!candidate) notFound();

  // Fetch interviewer campaign settings for room/meet link display
  const interviewerSettings = await prisma.interviewerCampaignSetting.findMany({
    where: { campaignId: candidate.campaignId },
    select: { interviewerId: true, mode: true, roomNumber: true, meetLink: true },
  });
  const settingMap: Record<string, { mode: string | null; roomNumber: string | null; meetLink: string | null }> = {};
  for (const s of interviewerSettings) {
    settingMap[s.interviewerId] = { mode: s.mode, roomNumber: s.roomNumber, meetLink: s.meetLink };
  }

  const isLateral = candidate.campaign?.type === "lateral";
  const activeInterviews = candidate.interviews.filter(
    (i) => i.status === "scheduled" || i.status === "ongoing"
  );
  const completedInterviews = candidate.interviews.filter(
    (i) => i.status === "completed"
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <AutoRefresh />
      <Link
        href={`/admin/campaigns/${candidate.campaignId}/candidates`}
        className="text-sm text-primary hover:text-primary-hover transition-colors"
      >
        &larr; Back to candidates
      </Link>

      {/* Candidate Info Card */}
      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
          {candidate.status === "rejected" && candidate.campaign?.status === "active" && (
            <ReincludeButton candidateId={candidate.id} candidateName={candidate.name} reincludeInPipeline={reincludeInPipeline} />
          )}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>
          )}
          {!isLateral && candidate.college && (
            <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>
          )}
          {!isLateral && candidate.department && (
            <p className="text-sm text-foreground-secondary">Department: {candidate.department}</p>
          )}
          {candidate.resumeLink && (
            <p className="text-sm">
              Resume:{" "}
              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                Open link
              </a>
            </p>
          )}
          <p className="text-sm text-foreground-secondary">
            Campaign: {candidate.campaign?.name}
          </p>
          {candidate.currentRole && (
            <p className="text-sm text-foreground-secondary">
              Current Role: {candidate.currentRole}
            </p>
          )}
          {candidate.hiredRole && (
            <p className="text-sm text-foreground-secondary">
              Hired Role: {candidate.hiredRole}
            </p>
          )}
          {isLateral && candidate.company && (
            <p className="text-sm text-foreground-secondary">Company: {candidate.company}</p>
          )}
          {isLateral && candidate.yearsOfExperience != null && (
            <p className="text-sm text-foreground-secondary">Years of Experience: {candidate.yearsOfExperience}</p>
          )}
          {isLateral && candidate.location && (
            <p className="text-sm text-foreground-secondary">Location: {candidate.location}</p>
          )}
          {isLateral && candidate.source && (
            <p className="text-sm text-foreground-secondary">
              Source: {candidate.source}{candidate.sourceDetail ? ` — ${candidate.sourceDetail}` : ""}
            </p>
          )}
          {isLateral && candidate.dateFirstSpoken && (
            <p className="text-sm text-foreground-secondary">
              Date First Spoken: {new Date(candidate.dateFirstSpoken).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {isLateral && candidate.currentCtc && (
            <p className="text-sm text-foreground-secondary">Current CTC: {candidate.currentCtc}</p>
          )}
          {isLateral && candidate.expectedCtc && (
            <p className="text-sm text-foreground-secondary">Expected CTC: {candidate.expectedCtc}</p>
          )}
          {isLateral && candidate.noticePeriod && (
            <p className="text-sm text-foreground-secondary">Notice Period: {candidate.noticePeriod}</p>
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

      {/* Active Interviews */}
      {activeInterviews.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">
            Active Interviews
          </h2>
          <ul className="space-y-3">
            {activeInterviews.map((interview) => (
              <li
                key={interview.id}
                className="border border-border rounded-xl bg-card p-4 text-sm text-foreground"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium flex items-center gap-2">
                    {interview.interviewer.name ?? interview.interviewer.email}
                    {(() => {
                      const s = settingMap[interview.interviewer.id];
                      if (!s?.mode) return null;
                      if (s.mode === "offline" && s.roomNumber) {
                        return <span className="text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-full px-2 py-0.5 font-medium">Room {s.roomNumber}</span>;
                      }
                      if (s.mode === "online" && s.meetLink) {
                        return (
                          <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-teal-100 text-teal-700 border border-teal-300 rounded-full px-2 py-0.5 font-medium hover:underline">
                            Meet link
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </p>
                  <div className="flex items-center gap-3">
                    {interview.scheduledAt && (
                      <span className="text-xs text-foreground-muted">
                        {new Date(interview.scheduledAt).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {new Date(interview.scheduledAt).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <StatusBadge
                      variant={interview.status === "ongoing" ? "interview_ongoing" : "interview_scheduled"}
                      label={interview.status === "ongoing" ? "Ongoing" : "Upcoming"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Past Interview Feedbacks */}
      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">
          Past Interview Feedbacks
        </h2>
        <FeedbackList
          candidateName={candidate.name}
          interviews={completedInterviews.map((interview, index) => {
            const panelSiblingNames = interview.panelGroupId
              ? completedInterviews
                  .filter((s) => s.panelGroupId === interview.panelGroupId && s.id !== interview.id)
                  .map((s) => s.interviewer.name ?? s.interviewer.email)
              : [];
            return {
              id: interview.id,
              round: index + 1,
              interviewerName: interview.interviewer.name ?? interview.interviewer.email,
              completedAt: interview.completedAt?.toISOString() ?? null,
              result: interview.feedback?.result ?? null,
              feedbackText: interview.feedback?.feedback ?? null,
              pointers: interview.feedback?.pointersForNextInterviewer ?? null,
              skillRatings: Array.isArray(interview.feedback?.skillRatings)
                ? (interview.feedback!.skillRatings as Array<{ skill: string; rating: number }>)
                : [],
              nextRoundAssigned: interview.completedAt
                ? candidate.interviews.some((other) => other.createdAt > interview.completedAt!)
                : false,
              panelGroupId: interview.panelGroupId ?? null,
              panelSiblingNames,
            };
          })}
        />
      </section>
    </div>
  );
}
