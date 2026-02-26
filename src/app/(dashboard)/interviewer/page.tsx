import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import AutoRefresh from "@/components/ui/AutoRefresh";

type SearchParams = { campaignId?: string | string[] };

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default async function InterviewerDashboardPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true },
  });

  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-foreground-muted">
          No campaigns yet.
        </p>
      </div>
    );
  }

  const queryCampaignId = Array.isArray(searchParams?.campaignId)
    ? searchParams?.campaignId[0]
    : searchParams?.campaignId;

  const defaultCampaignId = await getDefaultCampaignId(prisma, {
    isAdmin: false,
    userId: session.user.id,
  });
  if (!queryCampaignId && defaultCampaignId) {
    redirect(`/interviewer?campaignId=${defaultCampaignId}`);
  }
  const effectiveCampaignId =
    queryCampaignId ?? defaultCampaignId ?? campaigns[0].id;
  const selectedCampaign =
    campaigns.find((c) => c.id === effectiveCampaignId) ?? campaigns[0];

  const isFresher = selectedCampaign.type === "fresher";

  const [candidateCounts, interviewCounts, selectedByRole] = await Promise.all([
    prisma.candidate.groupBy({
      by: ["status"],
      where: { campaignId: selectedCampaign.id },
      _count: true,
    }),
    prisma.interview.groupBy({
      by: ["status"],
      where: { candidate: { campaignId: selectedCampaign.id } },
      _count: true,
    }),
    prisma.candidate.findMany({
      where: { status: "selected", campaignId: selectedCampaign.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        currentRole: true,
        hiredRole: true,
      },
    }),
  ]);

  const candidatesWithInterviews = await prisma.candidate.findMany({
    where: { campaignId: selectedCampaign.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      interviews: {
        select: {
          createdAt: true,
          completedAt: true,
          status: true,
          feedback: { select: { result: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Compute candidates per round (in_pipeline only)
  const candidatesPerRound: { round: number; count: number }[] = [];
  {
    const roundCounts: Record<number, number> = {};
    for (const candidate of candidatesWithInterviews) {
      if (candidate.status !== "in_pipeline") continue;
      const passedRounds = candidate.interviews.filter(
        (i) =>
          i.status === "completed" &&
          i.feedback &&
          (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
      ).length;
      const round = passedRounds + 1;
      roundCounts[round] = (roundCounts[round] ?? 0) + 1;
    }
    for (const [round, count] of Object.entries(roundCounts)) {
      candidatesPerRound.push({ round: Number(round), count });
    }
    candidatesPerRound.sort((a, b) => a.round - b.round);
  }

  // Fresher analytics data
  let avgWaitingTime: string | null = null;
  let rejectionsPerRound: { round: number; count: number }[] = [];

  if (isFresher) {
    const now = Date.now();
    const allWaits: number[] = [];
    for (const candidate of candidatesWithInterviews) {
      if (candidate.status !== "in_pipeline") continue;
      const hasScheduledOrOngoing = candidate.interviews.some(
        (i) => i.status === "scheduled" || i.status === "ongoing"
      );
      if (hasScheduledOrOngoing) continue;
      if (candidate.interviews.length === 0) {
        allWaits.push(now - new Date(candidate.createdAt).getTime());
        continue;
      }
      const completed = candidate.interviews.filter(
        (i) => i.status === "completed" && i.completedAt
      );
      if (completed.length > 0) {
        const lastCompleted = Math.max(
          ...completed.map((i) => new Date(i.completedAt!).getTime())
        );
        allWaits.push(now - lastCompleted);
      }
    }
    if (allWaits.length > 0) {
      const avg = allWaits.reduce((s, w) => s + w, 0) / allWaits.length;
      avgWaitingTime = formatDuration(avg);
    }
  }

  // Compute rejections per round (all campaign types)
  {
    const roundCounts: Record<number, number> = {};
    for (const candidate of candidatesWithInterviews) {
      if (candidate.status !== "rejected") continue;
      const feedbacks = candidate.interviews
        .filter((i) => i.feedback)
        .map((i) => i.feedback!.result);
      const positiveRounds = feedbacks.filter(
        (r) => r === "HIRE" || r === "WEAK_HIRE"
      ).length;
      const rejectionRound = positiveRounds + 1;
      roundCounts[rejectionRound] = (roundCounts[rejectionRound] ?? 0) + 1;
    }
    rejectionsPerRound = Object.entries(roundCounts)
      .map(([round, count]) => ({ round: Number(round), count }))
      .sort((a, b) => a.round - b.round);
  }

  const totalCandidates = candidateCounts.reduce((s, c) => s + c._count, 0);
  const rejected = candidateCounts.find((c) => c.status === "rejected")?._count ?? 0;
  const inPipeline = candidateCounts.find((c) => c.status === "in_pipeline")?._count ?? 0;
  const selected = candidateCounts.find((c) => c.status === "selected")?._count ?? 0;

  const conducted = interviewCounts.find((c) => c.status === "completed")?._count ?? 0;
  const ongoing = interviewCounts.find((c) => c.status === "ongoing")?._count ?? 0;
  const scheduled = interviewCounts.find((c) => c.status === "scheduled")?._count ?? 0;

  const stats: { label: string; value: string | number }[] = [
    { label: "Total Candidates", value: totalCandidates },
    { label: "Candidates in Pipeline", value: inPipeline },
    { label: "Selected Candidates", value: selected },
    { label: "Rejected Candidates", value: rejected },
    { label: "Interviews Conducted", value: conducted },
    { label: "Ongoing Interviews", value: ongoing },
    { label: "Scheduled Interviews", value: scheduled },
  ];

  if (isFresher) {
    stats.push({ label: "Avg. Waiting Time", value: avgWaitingTime ?? "—" });
  }

  // Interviewer links go to read-only interviewer routes
  const candidatesBase = `/interviewer/campaigns/${selectedCampaign.id}/candidates`;

  return (
    <div className="space-y-14">
      <AutoRefresh />
      <div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Campaign: <span className="font-medium text-foreground">{selectedCampaign.name}</span>
        </p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-card border border-border p-6"
          >
            <p className={`leading-none font-bold tabular-nums text-foreground ${
              typeof stat.value === "string" ? "text-[48px]" : "text-[72px]"
            }`}>
              {stat.value}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {candidatesPerRound.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground tracking-tight mb-4">Candidates Per Round</h2>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Round</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Candidates</th>
                </tr>
              </thead>
              <tbody>
                {candidatesPerRound.map(({ round, count }) => (
                  <tr key={round} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4" colSpan={2}>
                      <Link
                        href={`${candidatesBase}?status=in_pipeline&round=${round}`}
                        className="flex justify-between text-primary hover:text-primary-hover transition-colors"
                      >
                        <span className="font-medium">Round {round}</span>
                        <span>{count}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rejectionsPerRound.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground tracking-tight mb-4">Rejections Per Round</h2>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Round</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Rejections</th>
                </tr>
              </thead>
              <tbody>
                {rejectionsPerRound.map(({ round, count }) => (
                  <tr key={round} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4" colSpan={2}>
                      <Link
                        href={`${candidatesBase}?status=rejected&round=${round}`}
                        className="flex justify-between text-primary hover:text-primary-hover transition-colors"
                      >
                        <span className="font-medium">Round {round}</span>
                        <span>{count}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Selected Candidates</h2>
        {selectedByRole.length === 0 ? (
          <p className="text-sm text-foreground-muted py-6">None yet.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Name</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Current Role</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Hired Role</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Phone</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Email</th>
                </tr>
              </thead>
              <tbody>
                {selectedByRole.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4 text-foreground font-medium">{c.name}</td>
                    <td className="px-5 py-4 text-foreground-secondary">{c.currentRole ?? "—"}</td>
                    <td className="px-5 py-4">
                      {c.hiredRole ? (
                        <StatusBadge variant="selected" label={c.hiredRole} />
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-foreground-secondary">{c.phone ?? "—"}</td>
                    <td className="px-5 py-4 text-foreground-secondary">{c.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
