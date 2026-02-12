import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function CampaignsListPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          href="/admin/campaigns/new"
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          New campaign
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns. Create one to add candidates.</p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <li key={c.id} className="border rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-blue-600 hover:underline">
                  {c.name}
                </Link>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    c.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <span className="text-sm text-gray-500">{c._count.candidates} candidates</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
