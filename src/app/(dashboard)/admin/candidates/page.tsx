import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminCandidatesNoCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <p className="text-foreground-secondary text-lg">
        Select a campaign to see the candidates.
      </p>
      <p className="text-sm text-foreground-muted mt-1">
        Use the campaign dropdown in the sidebar to choose a campaign.
      </p>
    </div>
  );
}
