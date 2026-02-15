import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

type SearchParams = { campaignId?: string | string[] };

export default async function MyInterviewsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const campaignIdParam = searchParams?.campaignId;
  const campaignId =
    typeof campaignIdParam === "string"
      ? campaignIdParam
      : Array.isArray(campaignIdParam)
        ? campaignIdParam[0]
        : undefined;

  const defaultCampaignId = await getDefaultCampaignId(prisma, {
    isAdmin: session.user.role === "admin",
    userId: session.user.id,
  });
  if (!campaignId && defaultCampaignId) {
    redirect(`/interviewer/interviews?campaignId=${defaultCampaignId}`);
  }

  const [scheduled, completed] = await Promise.all([
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: { in: ["scheduled", "ongoing"] },
        ...(campaignId ? { candidate: { campaignId } } : {}),
      },
      include: {
        candidate: { select: { id: true, name: true, email: true, campaignId: true, campaign: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: "completed",
        ...(campaignId ? { candidate: { campaignId } } : {}),
      },
      include: {
        candidate: { select: { id: true, name: true, email: true, campaignId: true, campaign: { select: { name: true } } } },
        feedback: { select: { result: true } },
      },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold text-foreground tracking-tight">My Interviews</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scheduled / Ongoing */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Scheduled / Ongoing Interviews</h2>
          {scheduled.length === 0 ? (
            <p className="text-foreground-muted text-sm py-6">None.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <table className="w-full text-base border-collapse">
                <thead>
                  <tr className="bg-surface">
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Name</th>
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Status</th>
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/interviewer/interviews/${i.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {i.candidate.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge variant={i.status === "ongoing" ? "ongoing" : "scheduled"} />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/interviewer/interviews/${i.id}`}
                          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                          {i.status === "ongoing" ? "Continue" : "View"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Past Interviews */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Past Interviews</h2>
          {completed.length === 0 ? (
            <p className="text-foreground-muted text-sm py-6">None yet.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <table className="w-full text-base border-collapse">
                <thead>
                  <tr className="bg-surface">
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Name</th>
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Your Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((i) => {
                    const result = i.feedback?.result;
                    let feedbackVariant: "hire" | "no_hire" | "weak_hire" | "completed" = "completed";
                    if (result === "HIRE") feedbackVariant = "hire";
                    else if (result === "NO_HIRE") feedbackVariant = "no_hire";
                    else if (result === "WEAK_HIRE") feedbackVariant = "weak_hire";

                    return (
                      <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-4">
                          <Link
                            href={`/interviewer/candidates/${i.candidate.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {i.candidate.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge variant={feedbackVariant} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
