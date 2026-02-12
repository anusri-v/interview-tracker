import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AssignInterviewersButton from "./AssignInterviewersButton";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: {
          interviews: {
            include: { interviewer: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/admin/campaigns/${id}/candidates/new`}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Add candidate
          </Link>
          <Link
            href={`/admin/campaigns/${id}/candidates/upload`}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            Upload CSV
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Candidates ({campaign.candidates.length})</h2>
        {campaign.candidates.length === 0 ? (
          <p className="text-gray-500">No candidates yet. Add one or upload a CSV.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-zinc-800">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">College</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Resume</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Interviewers</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaign.candidates.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{c.email}</td>
                    <td className="p-2">{c.phone ?? "—"}</td>
                    <td className="p-2">{c.college ?? "—"}</td>
                    <td className="p-2">{c.department ?? "—"}</td>
                    <td className="p-2">
                      {c.resumeLink ? (
                        <a href={c.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Link
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-2">{c.status}</td>
                    <td className="p-2">{c.role ?? "—"}</td>
                    <td className="p-2">
                      {c.interviews.length === 0
                        ? "—"
                        : c.interviews.map((i) => i.interviewer.name ?? i.interviewer.email).join(", ")}
                    </td>
                    <td className="p-2 flex gap-2">
                      <AssignInterviewersButton candidateId={c.id} candidateName={c.name} />
                      <Link
                        href={`/admin/candidates/${c.id}/edit`}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Edit status
                      </Link>
                    </td>
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
