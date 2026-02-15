import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import MarkCampaignCompletedButton from "./[id]/MarkCampaignCompletedButton";
import NewCampaignButton from "./NewCampaignButton";

async function createCampaign(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  await prisma.campaign.create({
    data: {
      name: name.trim(),
      createdById: session.user.id,
    },
  });
  redirect("/admin/campaigns");
}

export default async function CampaignsListPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Campaigns</h1>
        <NewCampaignButton createCampaign={createCampaign} />
      </div>
      {campaigns.length === 0 ? (
        <p className="text-foreground-muted py-8">No campaigns. Create one to add candidates.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-base border-collapse">
            <thead>
              <tr className="bg-surface">
                <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Name</th>
                <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Status</th>
                <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Candidates</th>
                <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          c.status === "active" ? "bg-success" : "bg-foreground-muted"
                        }`}
                      />
                      <span className={c.status === "active" ? "text-success" : "text-foreground-secondary"}>
                        {c.status === "active" ? "Active" : "Completed"}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-foreground-secondary">{c._count.candidates}</td>
                  <td className="px-5 py-4">
                    {c.status === "active" && (
                      <MarkCampaignCompletedButton campaignId={c.id} campaignName={c.name} />
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
