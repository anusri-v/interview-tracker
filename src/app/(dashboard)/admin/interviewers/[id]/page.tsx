import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function InterviewerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const { campaignId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      interviewsConducted: {
        where: campaignId
          ? { candidate: { campaignId }, feedback: { isNot: null } }
          : { feedback: { isNot: null } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          completedAt: true,
          candidate: {
            select: {
              id: true,
              name: true,
              interviews: {
                where: { status: "completed", feedback: { isNot: null } },
                orderBy: { completedAt: "asc" },
                select: { id: true },
              },
            },
          },
          feedback: {
            select: { result: true, feedback: true },
          },
        },
      },
    },
  });

  if (!user) notFound();

  // Only show interviews that have feedback
  const feedbacks = user.interviewsConducted
    .filter((i) => i.feedback)
    .map((i) => {
      const roundIndex = i.candidate.interviews.findIndex((ci) => ci.id === i.id);
      return {
        id: i.id,
        candidateId: i.candidate.id,
        candidateName: i.candidate.name,
        round: roundIndex >= 0 ? roundIndex + 1 : null,
        result: i.feedback!.result,
        feedback: i.feedback!.feedback,
        completedAt: i.completedAt,
      };
    });

  const campaignQuery = campaignId ? `?campaignId=${campaignId}` : "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/interviewers${campaignQuery}`}
          className="text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Interviewers
        </Link>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">{user.name ?? user.email}</h1>
        <p className="text-foreground-secondary mt-1">{user.email}</p>
      </div>

      {/* Stats cards */}
      {feedbacks.length > 0 && (() => {
        const hireCount = feedbacks.filter((f) => f.result === "HIRE").length;
        const noHireCount = feedbacks.filter((f) => f.result === "NO_HIRE").length;
        const weakHireCount = feedbacks.filter((f) => f.result === "WEAK_HIRE").length;
        const noShowCount = feedbacks.filter((f) => f.result === "NO_SHOW").length;
        const stats = [
          { label: "Total Feedbacks", value: feedbacks.length },
          { label: "Hire", value: hireCount },
          { label: "No Hire", value: noHireCount },
          { label: "Weak Hire", value: weakHireCount },
          ...(noShowCount > 0 ? [{ label: "No Show", value: noShowCount }] : []),
        ];
        return (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-card border border-border p-6">
                <p className="text-[72px] leading-none font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">{stat.label}</p>
              </div>
            ))}
          </section>
        );
      })()}

      {feedbacks.length === 0 ? (
        <p className="text-foreground-muted py-4">No feedback submitted{campaignId ? " for this campaign" : ""} yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feedbacks.map((f) => (
            <div key={f.id} className="border border-border rounded-xl bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/candidates/${f.candidateId}/details`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {f.candidateName}
                </Link>
                <StatusBadge variant={f.result.toLowerCase() as any} />
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground-secondary">
                {f.round && <span>Round {f.round}</span>}
                {f.completedAt && (
                  <>
                    <span className="text-border">|</span>
                    <span>{new Date(f.completedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</span>
                  </>
                )}
              </div>
              {f.feedback ? (
                <p className="text-sm text-foreground-secondary leading-relaxed">{f.feedback}</p>
              ) : (
                <p className="text-sm text-foreground-muted italic">No written feedback</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
