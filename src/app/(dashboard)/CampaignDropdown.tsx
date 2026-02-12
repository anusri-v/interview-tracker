"use client";

import { useRouter, usePathname } from "next/navigation";

type Campaign = { id: string; name: string };

export default function CampaignDropdown({
  campaigns,
  basePath,
  defaultCampaignId,
}: {
  campaigns: Campaign[];
  basePath: "admin" | "interviewer";
  defaultCampaignId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const campaignPrefix = `/${basePath}/campaigns/`;
  const currentId = pathname.startsWith(campaignPrefix)
    ? pathname.slice(campaignPrefix.length).split("/")[0]
    : "";
  const selectedId = currentId || defaultCampaignId || "";

  if (campaigns.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="campaign-select" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        Campaign:
      </label>
      <select
        id="campaign-select"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          if (id) router.push(`/${basePath}/campaigns/${id}`);
        }}
        className="text-sm border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700 min-w-[160px]"
      >
        <option value="">— Select —</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
