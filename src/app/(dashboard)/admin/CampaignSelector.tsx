"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

type CampaignOption = {
  id: string;
  name: string;
};

export default function CampaignSelector({
  campaigns,
  selectedId,
}: {
  campaigns: CampaignOption[];
  selectedId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("campaignId", id);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <select
      value={selectedId}
      onChange={handleChange}
      className="border border-border rounded px-2 py-1 text-sm bg-card text-foreground"
    >
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

