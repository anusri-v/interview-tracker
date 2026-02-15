import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import Link from "next/link";

type SearchParams = { campaignId?: string | string[] };

export default async function InterviewerDashboardPage({
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
    isAdmin: false,
    userId: session.user.id,
  });
  if (!campaignId && defaultCampaignId) {
    redirect(`/interviewer?campaignId=${defaultCampaignId}`);
  }
  const effectiveCampaignId = campaignId ?? defaultCampaignId ?? undefined;

  const campaignFilter = effectiveCampaignId
    ? { candidate: { campaignId: effectiveCampaignId } }
    : {};

  const [pastCount, upcoming, campaign] = await Promise.all([
    prisma.interview.count({
      where: {
        interviewerId: session.user.id,
        status: "completed",
        ...campaignFilter,
      },
    }),
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: { in: ["scheduled", "ongoing"] },
        ...campaignFilter,
      },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    effectiveCampaignId
      ? prisma.campaign.findUnique({
          where: { id: effectiveCampaignId },
          select: { name: true },
        })
      : null,
  ]);

  if (campaignId && !campaign) redirect("/interviewer");

  const interviewsHref = effectiveCampaignId
    ? `/interviewer/interviews?campaignId=${effectiveCampaignId}`
    : "/interviewer/interviews";

  return (
    <div className="space-y-14">
      <div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
        {campaign && (
          <p className="mt-1 text-sm text-foreground-muted">
            Campaign: <span className="font-medium text-foreground">{campaign.name}</span>
          </p>
        )}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-card border border-border p-6">
          <p className="text-[72px] leading-none font-bold tabular-nums text-foreground">{pastCount}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">Completed interviews</p>
          <Link href={interviewsHref} className="mt-5 inline-block text-sm font-medium text-primary hover:text-primary-hover transition-colors">
            View list →
          </Link>
        </div>
        <div className="rounded-xl bg-card border border-border p-6">
          <p className="text-[72px] leading-none font-bold tabular-nums text-foreground">{upcoming.length}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-foreground-muted">Upcoming interviews</p>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-foreground-muted">No upcoming interviews.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {upcoming.map((i) => (
                <li key={i.id} className="flex flex-col gap-0.5">
                  <Link
                    href={`/interviewer/interviews/${i.id}`}
                    className="font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    {i.candidate.name}
                  </Link>
                  <span className="text-xs text-foreground-muted">
                    {new Date(i.scheduledAt).toLocaleString()} · {i.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
