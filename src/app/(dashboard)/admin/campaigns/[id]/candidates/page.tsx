import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AssignInterviewersButton from "../AssignInterviewersButton";
import CandidatesTableFilters from "./CandidatesTableFilters";

type StatusFilter = "in_pipeline" | "rejected" | "selected" | "all";

export default async function CampaignCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const { search = "", status: statusParam } = await searchParams;
  const statusFilter = (statusParam === "in_pipeline" || statusParam === "rejected" || statusParam === "selected"
    ? statusParam
    : "all") as StatusFilter;
  const searchTrimmed = typeof search === "string" ? search.trim() : "";

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      candidates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!campaign) notFound();

  let candidates = campaign.candidates;
  if (searchTrimmed) {
    const lower = searchTrimmed.toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
    );
  }
  if (statusFilter !== "all") {
    candidates = candidates.filter((c) => c.status === statusFilter);
  }

  const isActive = campaign.status === "active";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Candidates</h1>
        {isActive && (
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
        )}
      </div>

      <CandidatesTableFilters
        campaignId={id}
        search={searchTrimmed}
        statusFilter={statusFilter}
      />

      {candidates.length === 0 ? (
        <p className="text-gray-500 py-4">
          {campaign.candidates.length === 0
            ? "No candidates yet. Add one or upload a CSV."
            : "No candidates match your search or filter."}
        </p>
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
                {isActive && <th className="text-left p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">
                    <Link
                      href={`/admin/candidates/${c.id}/details`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.phone ?? "—"}</td>
                  <td className="p-2">{c.college ?? "—"}</td>
                  <td className="p-2">{c.department ?? "—"}</td>
                  <td className="p-2">
                    {c.resumeLink ? (
                      <a
                        href={c.resumeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">{c.status}</td>
                  <td className="p-2">{c.role ?? "—"}</td>
                  {isActive && (
                    <td className="p-2 flex gap-2">
                      <AssignInterviewersButton
                        candidateId={c.id}
                        candidateName={c.name}
                      />
                      <Link
                        href={`/admin/candidates/${c.id}/edit`}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Edit status
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
