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
              <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-blue-600 hover:underline">
                {c.name}
              </Link>
              <span className="text-sm text-gray-500">{c._count.candidates} candidates</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
