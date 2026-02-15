"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "interview-tracker-campaign";

function getStorageKey(basePath: "admin" | "interviewer") {
  return `${STORAGE_KEY_PREFIX}-${basePath}`;
}

export function getStoredCampaignId(basePath: "admin" | "interviewer"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(getStorageKey(basePath));
  } catch {
    return null;
  }
}

export function setStoredCampaignId(basePath: "admin" | "interviewer", id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(getStorageKey(basePath), id);
    else sessionStorage.removeItem(getStorageKey(basePath));
  } catch {
    // ignore
  }
}

type Campaign = { id: string; name: string };

export function useResolvedCampaignId({
  basePath,
  campaigns,
  defaultCampaignId,
  currentIdFromPath,
  campaignIdFromQuery,
  useQueryOrPathForDashboard,
}: {
  basePath: "admin" | "interviewer";
  campaigns: Campaign[];
  defaultCampaignId: string | null;
  currentIdFromPath: string;
  campaignIdFromQuery: string | null;
  /** When true, selectedId is from query or path (dashboard/my-interviews); when false, from path only (campaign subpath). */
  useQueryOrPathForDashboard: boolean;
}) {
  const [sessionCampaignId, setSessionCampaignId] = useState<string | null>(null);

  // Hydrate session campaign from storage after mount (avoids hydration mismatch).
  useEffect(() => {
    const stored = getStoredCampaignId(basePath);
    setSessionCampaignId(stored);
  }, [basePath]);

  const campaignIds = new Set(campaigns.map((c) => c.id));
  const validSessionId =
    sessionCampaignId && campaignIds.has(sessionCampaignId) ? sessionCampaignId : null;

  const fromPath = currentIdFromPath && campaignIds.has(currentIdFromPath) ? currentIdFromPath : "";
  const fromQuery =
    campaignIdFromQuery && campaignIds.has(campaignIdFromQuery) ? campaignIdFromQuery : null;

  const selectedId = useQueryOrPathForDashboard
    ? fromQuery ?? validSessionId ?? defaultCampaignId ?? ""
    : fromPath || validSessionId || defaultCampaignId || "";

  // Persist whenever the resolved id comes from URL (path or query) so session stays in sync.
  useEffect(() => {
    const fromUrl = useQueryOrPathForDashboard ? fromQuery : fromPath;
    if (fromUrl) setStoredCampaignId(basePath, fromUrl);
  }, [basePath, fromQuery ?? "", fromPath, useQueryOrPathForDashboard]);

  function persistCampaignId(id: string | null) {
    setStoredCampaignId(basePath, id);
    if (id) setSessionCampaignId(id);
    else setSessionCampaignId(null);
  }

  return { selectedId, persistCampaignId };
}
