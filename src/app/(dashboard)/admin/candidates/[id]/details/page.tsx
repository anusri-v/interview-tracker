import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";

export const dynamic = "force-dynamic";

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
          interviewer: { select: { name: true, email: true } },
        },
        orderBy: { completedAt: "asc" },
      },
    },
  });
  if (!candidate) notFound();

  const isExperienced = candidate.campaign?.type === "experienced";
  const completedInterviews = candidate.interviews.filter(
    (i) => i.status === "completed"
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}/candidates`}
        className="text-sm text-primary hover:text-primary-hover transition-colors"
      >
        &larr; Back to candidates
      </Link>

      {/* Candidate Info Card */}
      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>
          )}
          {!isExperienced && candidate.college && (
            <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>
          )}
          {!isExperienced && candidate.department && (
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
        </div>
      </div>

      {/* Past Interview Feedbacks */}
      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">
          Past Interview Feedbacks
        </h2>
        {completedInterviews.length === 0 ? (
          <p className="text-foreground-muted text-sm">No completed interviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {completedInterviews.map((interview, index) => (
              <li
                key={interview.id}
                className="border border-border rounded-xl bg-card p-4 text-sm text-foreground"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    Round {index + 1} &mdash;{" "}
                    {interview.interviewer.name ?? interview.interviewer.email}
                  </p>
                  <div className="flex items-center gap-3">
                    {interview.completedAt && (
                      <span className="text-xs text-foreground-muted">
                        {new Date(interview.completedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {new Date(interview.completedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {interview.feedback && (
                      <StatusBadge
                        variant={interview.feedback.result.toLowerCase() as any}
                      />
                    )}
                  </div>
                </div>
                {interview.feedback && (
                  <>
                    <p className="mt-2 text-foreground-secondary">
                      {interview.feedback.feedback}
                    </p>
                    <SkillRatingsDisplay skillRatings={interview.feedback.skillRatings} />
                    {interview.feedback.pointersForNextInterviewer && (
                      <p className="mt-1 text-foreground-muted">
                        Pointers for next interviewer:{" "}
                        {interview.feedback.pointersForNextInterviewer}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
