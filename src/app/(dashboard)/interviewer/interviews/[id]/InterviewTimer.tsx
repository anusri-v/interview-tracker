"use client";

import { useEffect, useState } from "react";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startedAt).getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(startedAt).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="border border-border rounded-xl bg-card p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-foreground-muted mb-1">Interview Duration</p>
      <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
        {formatElapsed(elapsed)}
      </p>
    </div>
  );
}
