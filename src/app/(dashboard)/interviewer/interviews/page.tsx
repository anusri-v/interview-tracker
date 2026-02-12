import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function MyInterviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [scheduled, completed] = await Promise.all([
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: { in: ["scheduled", "ongoing"] },
      },
      include: {
        candidate: { select: { id: true, name: true, email: true, campaign: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.interview.findMany({
      where: {
        interviewerId: session.user.id,
        status: "completed",
      },
      include: {
        candidate: { select: { id: true, name: true, email: true, campaign: { select: { name: true } } } },
      },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My interviews</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Scheduled / ongoing</h2>
        {scheduled.length === 0 ? (
          <p className="text-gray-500 text-sm">None.</p>
        ) : (
          <ul className="space-y-2 border rounded divide-y overflow-hidden">
            {scheduled.map((i) => (
              <li key={i.id} className="p-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/interviewer/interviews/${i.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {i.candidate.name}
                  </Link>
                  <span className="text-sm text-gray-500 ml-2">
                    {i.candidate.campaign?.name} — {new Date(i.scheduledAt).toLocaleString()} — {i.status}
                  </span>
                </div>
                <Link
                  href={`/interviewer/interviews/${i.id}`}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {i.status === "ongoing" ? "Continue" : "View"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Completed (candidates you interviewed)</h2>
        {completed.length === 0 ? (
          <p className="text-gray-500 text-sm">None yet.</p>
        ) : (
          <ul className="space-y-2 border rounded divide-y overflow-hidden">
            {completed.map((i) => (
              <li key={i.id} className="p-3">
                <Link
                  href={`/interviewer/candidates/${i.candidate.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {i.candidate.name}
                </Link>
                <span className="text-sm text-gray-500 ml-2">
                  {i.candidate.campaign?.name} — completed {i.completedAt && new Date(i.completedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
