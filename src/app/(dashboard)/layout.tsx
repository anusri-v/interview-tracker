import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/db";
import SignOutButton from "./SignOutButton";
import CampaignDropdown from "./CampaignDropdown";

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
    isAdmin
      ? prisma.campaign.findFirst({
          where: { status: "active" },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }).then((c) => c?.id ?? null)
      : prisma.campaign.findFirst({
          where: {
            status: "active",
            candidates: {
              some: {
                interviews: { some: { interviewerId: session.user.id! } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }).then((c) => c?.id ?? null),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-4">
          <Link href={isAdmin ? "/admin" : "/interviewer"} className="font-semibold">
            Interview Tracker
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Dashboard
              </Link>
              <Link href="/admin/campaigns" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Campaigns
              </Link>
              <Link href="/admin/users" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Manage admins
              </Link>
            </>
          )}
          {!isAdmin && (
            <>
              <Link href="/interviewer" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Dashboard
              </Link>
              <Link href="/interviewer/interviews" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                My interviews
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <CampaignDropdown
            campaigns={campaigns}
            basePath={isAdmin ? "admin" : "interviewer"}
            defaultCampaignId={defaultCampaignId}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {session.user.email} ({session.user.role})
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
