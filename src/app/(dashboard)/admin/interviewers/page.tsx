import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InterviewersPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { campaignId } = await searchParams;

  const users = await prisma.user.findMany({
    where: { role: { in: ["interviewer", "admin"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      interviewsConducted: {
        where: campaignId
          ? { candidate: { campaignId } }
          : undefined,
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const interviewers = users.map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    role: u.role,
    completed: u.interviewsConducted.filter((i) => i.status === "completed").length,
    scheduled: u.interviewsConducted.filter((i) => i.status === "scheduled").length,
    ongoing: u.interviewsConducted.filter((i) => i.status === "ongoing").length,
  }));

  const campaignQuery = campaignId ? `?campaignId=${campaignId}` : "";

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Interviewers</h1>

      {interviewers.length === 0 ? (
        <p className="text-foreground-muted py-4">No interviewers found.</p>
      ) : (
        <div className="border border-border rounded-xl overflow-x-auto bg-card">
          <table className="w-full text-base border-collapse">
            <thead className="bg-surface">
              <tr>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Completed</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border">Active</th>
              </tr>
            </thead>
            <tbody>
              {interviewers.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/interviewers/${i.id}${campaignQuery}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{i.email}</td>
                  <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap capitalize">{i.role}</td>
                  <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{i.completed}</td>
                  <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">
                    {i.scheduled + i.ongoing > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {i.scheduled > 0 && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">{i.scheduled} scheduled</span>}
                        {i.ongoing > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">{i.ongoing} ongoing</span>}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
