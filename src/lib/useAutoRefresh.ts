"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(intervalMs = 30000) {
  const router = useRouter();
  useEffect(() => {
    // Refresh immediately on mount to bust the client-side Router Cache
    router.refresh();
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
}
