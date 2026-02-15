import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import StatusBadge from "@/components/ui/StatusBadge";

type SearchParams = { campaignId?: string | string[] };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-foreground-muted">
          No campaigns yet. Create a campaign to see dashboard data.
        </p>
      </div>
    );
  }

  const queryCampaignId = Array.isArray(searchParams?.campaignId)
    ? searchParams?.campaignId[0]
    : searchParams?.campaignId;

  const defaultCampaignId = await getDefaultCampaignId(prisma, { isAdmin: true });
  const effectiveCampaignId =
    queryCampaignId ?? defaultCampaignId ?? campaigns[0].id;
  const selectedCampaign =
    campaigns.find((c) => c.id === effectiveCampaignId) ?? campaigns[0];

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
        role: true,
      },
    }),
  ]);

  const totalCandidates = candidateCounts.reduce((s, c) => s + c._count, 0);
  const rejected = candidateCounts.find((c) => c.status === "rejected")?._count ?? 0;
  const inPipeline =
    candidateCounts.find((c) => c.status === "in_pipeline")?._count ?? 0;
  const selected = candidateCounts.find((c) => c.status === "selected")?._count ?? 0;

  const conducted =
    interviewCounts.find((c) => c.status === "completed")?._count ?? 0;
  const ongoing =
    interviewCounts.find((c) => c.status === "ongoing")?._count ?? 0;
  const scheduled =
    interviewCounts.find((c) => c.status === "scheduled")?._count ?? 0;

  const stats = [
    { label: "Total Candidates", value: totalCandidates },
    { label: "Candidates in Pipeline", value: inPipeline },
    { label: "Selected Candidates", value: selected },
    { label: "Rejected Candidates", value: rejected },
    { label: "Interviews Conducted", value: conducted },
    { label: "Ongoing Interviews", value: ongoing },
    { label: "Scheduled Interviews", value: scheduled },
  ];

  return (
    <div className="space-y-14">
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
            <p className="text-[72px] leading-none font-bold tabular-nums text-foreground">
              {stat.value}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

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
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Role</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Phone</th>
                  <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Email</th>
                </tr>
              </thead>
              <tbody>
                {selectedByRole.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4 text-foreground font-medium">{c.name}</td>
                    <td className="px-5 py-4">
                      {c.role ? (
                        <StatusBadge variant="selected" label={c.role} />
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
