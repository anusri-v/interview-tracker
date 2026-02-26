"use client";

import { useAutoRefresh } from "@/lib/useAutoRefresh";

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  useAutoRefresh(intervalMs);
  return null;
}
