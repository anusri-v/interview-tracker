import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefaultCampaignId } from "@/lib/campaigns";
import Sidebar from "./Sidebar";

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
      <main className="flex-1 ml-[250px] px-8 py-10 md:px-12 md:py-12">
        {children}
      </main>
    </div>
  );
}
