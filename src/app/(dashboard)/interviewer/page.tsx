import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function InterviewerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [pastCount, upcoming] = await Promise.all([
    prisma.interview.count({
      where: {
        interviewerId: session.user.id,
        status: "completed",
      },
    }),
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: { in: ["scheduled", "ongoing"] },
      },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Interviewer dashboard</h1>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-1">Past interviews</h2>
          <p className="text-2xl font-bold">{pastCount}</p>
          <Link href="/interviewer/interviews" className="text-sm text-blue-600 hover:underline">
            View list →
          </Link>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming interviews.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/interviewer/interviews/${i.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {i.candidate.name}
                  </Link>{" "}
                  — {new Date(i.scheduledAt).toLocaleString()} ({i.status})
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
