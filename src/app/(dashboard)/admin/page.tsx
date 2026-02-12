import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [campaigns, candidateCounts, interviewCounts, selectedByRole] =
    await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { candidates: true } } },
      }),
      prisma.candidate.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.interview.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.candidate.findMany({
        where: { status: "selected" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          campaign: { select: { name: true } },
        },
      }),
    ]);

  const totalCandidates = candidateCounts.reduce((s, c) => s + c._count, 0);
  const rejected = candidateCounts.find((c) => c.status === "rejected")?._count ?? 0;
  const inPipeline = candidateCounts.find((c) => c.status === "in_pipeline")?._count ?? 0;
  const selected = candidateCounts.find((c) => c.status === "selected")?._count ?? 0;

  const conducted = interviewCounts.find((c) => c.status === "completed")?._count ?? 0;
  const ongoing = interviewCounts.find((c) => c.status === "ongoing")?._count ?? 0;
  const scheduled = interviewCounts.find((c) => c.status === "scheduled")?._count ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Campaigns</h2>
        <ul className="list-disc list-inside space-y-1">
          {campaigns.length === 0 ? (
            <li className="text-gray-500">No campaigns yet.</li>
          ) : (
            campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/campaigns/${c.id}`} className="text-blue-600 hover:underline">
                  {c.name}
                </Link>{" "}
                ({c._count.candidates} candidates)
              </li>
            ))
          )}
        </ul>
        <Link
          href="/admin/campaigns/new"
          className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          New campaign
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Candidates (5.1)</h2>
          <ul className="space-y-1 text-sm">
            <li>Total: {totalCandidates}</li>
            <li>Rejected: {rejected}</li>
            <li>In pipeline: {inPipeline}</li>
            <li>Selected: {selected}</li>
          </ul>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Interviews (5.2)</h2>
          <ul className="space-y-1 text-sm">
            <li>Conducted: {conducted}</li>
            <li>Ongoing: {ongoing}</li>
            <li>Scheduled: {scheduled}</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Selected candidates and roles (5.3)</h2>
        {selectedByRole.length === 0 ? (
          <p className="text-gray-500 text-sm">None yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse border">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-800">
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Campaign</th>
                <th className="border p-2 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {selectedByRole.map((c) => (
                <tr key={c.id}>
                  <td className="border p-2">{c.name}</td>
                  <td className="border p-2">{c.email}</td>
                  <td className="border p-2">{c.campaign?.name ?? "—"}</td>
                  <td className="border p-2">{c.role ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
