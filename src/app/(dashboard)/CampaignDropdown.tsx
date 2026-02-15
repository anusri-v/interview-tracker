"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useResolvedCampaignId } from "@/hooks/useResolvedCampaignId";

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
  const searchParams = useSearchParams();
  const campaignPrefix = `/${basePath}/campaigns/`;
  const isMyInterviewsPage =
    pathname === "/interviewer/interviews" || pathname.startsWith("/interviewer/interviews/");
  const isAdminDashboardPage = basePath === "admin" && pathname === "/admin";
  const isInterviewerDashboardPage = basePath === "interviewer" && pathname === "/interviewer";
  const isCampaignSubpath = pathname.startsWith(campaignPrefix);

  const currentIdFromPath = isCampaignSubpath
    ? pathname.slice(campaignPrefix.length).split("/")[0]
    : "";
  const campaignIdFromQuery =
    isMyInterviewsPage || isAdminDashboardPage || isInterviewerDashboardPage
      ? searchParams.get("campaignId")
      : null;

  const useQueryOrPathForDashboard =
    isMyInterviewsPage || isAdminDashboardPage || isInterviewerDashboardPage;
  const { selectedId, persistCampaignId } = useResolvedCampaignId({
    basePath,
    campaigns,
    defaultCampaignId,
    currentIdFromPath,
    campaignIdFromQuery,
    useQueryOrPathForDashboard,
  });

  if (campaigns.length === 0) return null;

  function handleChange(id: string, persist: (id: string | null) => void) {
    persist(id || null);
    if (isMyInterviewsPage) {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("campaignId", id);
      else params.delete("campaignId");
      const q = params.toString();
      router.push(`${pathname}${q ? `?${q}` : ""}`);
    } else if (isAdminDashboardPage) {
      router.push(id ? `/admin?campaignId=${id}` : "/admin");
    } else if (isInterviewerDashboardPage) {
      router.push(id ? `/interviewer?campaignId=${id}` : "/interviewer");
    } else if (isCampaignSubpath && id) {
      const afterPrefix = pathname.slice(campaignPrefix.length);
      const segments = afterPrefix.split("/").filter(Boolean);
      const rest = segments.slice(1).join("/");
      const newPath = `/${basePath}/campaigns/${id}${rest ? `/${rest}` : ""}`;
      router.push(newPath);
    } else if (id) {
      router.push(`/${basePath}/campaigns/${id}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="campaign-select" className="text-sm text-foreground-secondary whitespace-nowrap">
        Campaign:
      </label>
      <select
        id="campaign-select"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value, persistCampaignId)}
        className="text-sm border border-border rounded px-2 py-1 bg-card text-foreground min-w-[160px]"
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
