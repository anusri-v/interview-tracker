import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import Sidebar from "./Sidebar";
import StuckCandidatesBanner, {
  type StuckCandidate,
} from "@/components/ui/StuckCandidatesBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const [campaigns, defaultCampaignId] = await Promise.all([
    isAdmin
      ? prisma.campaign.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : prisma.campaign.findMany({
          where: {
            candidates: {
              some: {
                interviews: { some: { interviewerId: session.user.id! } },
              },
            },
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
    getDefaultCampaignId(prisma, {
      isAdmin,
      userId: session.user.id,
    }),
  ]);

  // Stuck candidates query — admin only
  // Includes: in_pipeline candidates with completed interviews but no next round,
  // AND in_pipeline candidates with zero interviews (never assigned).
  let stuckCandidates: StuckCandidate[] = [];
  if (isAdmin) {
    const [withCompleted, neverAssigned] = await Promise.all([
      // Candidates with at least one completed interview but no scheduled/ongoing
      prisma.candidate.findMany({
        where: {
          status: "in_pipeline",
          campaign: { type: "fresher", status: "active" },
          interviews: { some: { status: "completed" } },
          NOT: {
            interviews: {
              some: { status: { in: ["scheduled", "ongoing"] } },
            },
          },
        },
        select: {
          id: true,
          name: true,
          campaignId: true,
          campaign: { select: { name: true } },
          interviews: {
            where: { status: "completed" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { completedAt: true },
          },
        },
      }),
      // Candidates with zero interviews at all
      prisma.candidate.findMany({
        where: {
          status: "in_pipeline",
          campaign: { type: "fresher", status: "active" },
          interviews: { none: {} },
        },
        select: {
          id: true,
          name: true,
          campaignId: true,
          campaign: { select: { name: true } },
          createdAt: true,
        },
      }),
    ]);

    const now = Date.now();

    const fromCompleted: StuckCandidate[] = withCompleted
      .filter((c) => c.interviews[0]?.completedAt)
      .map((c) => {
        const completedAt = new Date(c.interviews[0].completedAt!).getTime();
        return {
          candidateId: c.id,
          candidateName: c.name,
          campaignId: c.campaignId,
          campaignName: c.campaign.name,
          waitingHours: (now - completedAt) / 3600000,
        };
      });

    const fromNeverAssigned: StuckCandidate[] = neverAssigned.map((c) => ({
      candidateId: c.id,
      candidateName: c.name,
      campaignId: c.campaignId,
      campaignName: c.campaign.name,
      waitingHours: (now - new Date(c.createdAt).getTime()) / 3600000,
    }));

    stuckCandidates = [...fromCompleted, ...fromNeverAssigned]
      .filter((c) => c.waitingHours >= 2)
      .sort((a, b) => b.waitingHours - a.waitingHours);
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar
        isAdmin={isAdmin}
        email={session.user.email ?? ""}
        role={session.user.role}
        campaigns={campaigns}
        basePath={isAdmin ? "admin" : "interviewer"}
        defaultCampaignId={defaultCampaignId}
      />
      <main className="flex-1 min-w-0 ml-[250px] px-8 py-10 md:px-12 md:py-12">
        {children}
      </main>
      {isAdmin && stuckCandidates.length > 0 && (
        <StuckCandidatesBanner candidates={stuckCandidates} />
      )}
    </div>
  );
}
