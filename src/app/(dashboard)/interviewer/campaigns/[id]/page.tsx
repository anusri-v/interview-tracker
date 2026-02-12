import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function InterviewerCampaignCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: {
      id,
      candidates: {
        some: {
          interviews: { some: { interviewerId: session.user.id } },
        },
      },
    },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: {
          interviews: {
            where: { interviewerId: session.user.id! },
            select: { id: true, status: true },
          },
        },
      },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <span
          className={`px-2 py-0.5 rounded text-sm font-medium ${
            campaign.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
              : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300"
          }`}
        >
          {campaign.status === "active" ? "Active" : "Completed"}
        </span>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Candidates ({campaign.candidates.length})</h2>
        {campaign.candidates.length === 0 ? (
          <p className="text-gray-500">No candidates in this campaign.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-zinc-800">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">College</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Your interview</th>
                </tr>
              </thead>
              <tbody>
                {campaign.candidates.map((c) => {
                  const myInterview = c.interviews[0];
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="p-2">{c.name}</td>
                      <td className="p-2">{c.email}</td>
                      <td className="p-2">{c.phone ?? "—"}</td>
                      <td className="p-2">{c.college ?? "—"}</td>
                      <td className="p-2">{c.status}</td>
                      <td className="p-2">{c.role ?? "—"}</td>
                      <td className="p-2">
                        {myInterview ? (
                          <Link
                            href={`/interviewer/interviews/${myInterview.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {myInterview.status === "completed"
                              ? "View"
                              : myInterview.status === "ongoing"
                                ? "Continue"
                                : "Start"}
                          </Link>
                        ) : (
                          "—"
                        )}
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
  );
}
