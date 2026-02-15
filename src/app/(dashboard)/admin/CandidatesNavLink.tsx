"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CandidatesNavLink({
  defaultCampaignId,
}: {
  defaultCampaignId: string | null;
}) {
  const pathname = usePathname();
  const campaignIdMatch = pathname.match(/^\/admin\/campaigns\/([^/]+)/);
  const campaignId = campaignIdMatch?.[1] ?? defaultCampaignId;
  const href = campaignId
    ? `/admin/campaigns/${campaignId}/candidates`
    : "/admin/candidates";

  return (
    <Link
      href={href}
      className="text-sm text-foreground-secondary hover:text-foreground hover:underline"
    >
      Candidates
    </Link>
  );
}
