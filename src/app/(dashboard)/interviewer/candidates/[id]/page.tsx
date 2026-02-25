import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";

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
        where: { status: "completed" },
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

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href={`/interviewer/campaigns/${candidate.campaignId}/candidates`} className="text-sm text-primary hover:text-primary-hover transition-colors">
        &larr; Back to candidates
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>}
          {!isExperienced && candidate.college && <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>}
          {!isExperienced && candidate.department && <p className="text-sm text-foreground-secondary">Department: {candidate.department}</p>}
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
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
        {candidate.interviews.length === 0 ? (
          <p className="text-foreground-muted text-sm">No completed interviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {candidate.interviews.map((i) => (
              <li key={i.id} className="border border-border rounded-xl bg-card p-4 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{i.interviewer.name ?? i.interviewer.email}</p>
                  <div className="flex items-center gap-3">
                    {i.completedAt && (
                      <span className="text-xs text-foreground-muted">
                        {new Date(i.completedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {new Date(i.completedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {i.feedback && (
                      <StatusBadge variant={i.feedback.result.toLowerCase() as any} />
                    )}
                  </div>
                </div>
                {i.feedback && (
                  <>
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
        )}
      </section>
    </div>
  );
}
