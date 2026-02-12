import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminCandidatesNoCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 p-12 text-center">
      <p className="text-gray-600 dark:text-gray-400 text-lg">
        Select a campaign to see the candidates.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
        Use the campaign dropdown in the top right to choose a campaign.
      </p>
    </div>
  );
}
