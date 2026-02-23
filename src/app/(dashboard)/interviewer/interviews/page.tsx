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

  // Fetch selected campaign to check type
  const selectedCampaign = campaignId
    ? await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, type: true, status: true },
      })
    : null;

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
        candidate: {
          select: {
            id: true, name: true, email: true, campaignId: true,
            campaign: { select: { name: true } },
            interviews: {
              where: { status: "completed" },
              select: { id: true, completedAt: true },
              orderBy: { completedAt: "asc" },
            },
          },
        },
        feedback: { select: { result: true } },
      },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">My Interviews</h1>
        {selectedCampaign?.type === "experienced" && selectedCampaign.status === "active" && (
          <Link
            href={`/interviewer/campaigns/${selectedCampaign.id}/availability`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Manage Availability
          </Link>
        )}
      </div>

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
                    <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Round</th>
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

                    const roundIndex = i.candidate.interviews.findIndex((ci) => ci.id === i.id);
                    const round = roundIndex >= 0 ? roundIndex + 1 : "—";

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
                        <td className="px-5 py-4 text-foreground-secondary">{round}</td>
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
