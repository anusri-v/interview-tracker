"use client";

import { useState } from "react";
import Link from "next/link";

export type StuckCandidate = {
  candidateId: string;
  candidateName: string;
  campaignId: string;
  campaignName: string;
  waitingHours: number;
};

export default function StuckCandidatesBanner({
  candidates,
}: {
  candidates: StuckCandidate[];
}) {
  const [dismissed, setDismissed] = useState(false);

  if (candidates.length === 0 || dismissed) return null;

  const maxWait = Math.max(...candidates.map((c) => c.waitingHours));
  const isRed = maxWait >= 3;
  const isYellow = maxWait >= 2;

  const bgColor = isRed
    ? "bg-red-50 border-red-300"
    : isYellow
      ? "bg-yellow-50 border-yellow-300"
      : "bg-yellow-50 border-yellow-300";

  const textColor = isRed ? "text-red-800" : "text-yellow-800";
  const subtextColor = isRed ? "text-red-600" : "text-yellow-600";

  // Link to the campaign with the longest waiting candidate
  const longestWaiting = candidates.reduce((max, c) =>
    c.waitingHours > max.waitingHours ? c : max
  );

  const formatWait = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border shadow-lg p-4 ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${textColor}`}>
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} waiting
            for next round
          </p>
          <p className={`text-xs mt-1 ${subtextColor}`}>
            Longest wait: {formatWait(maxWait)}
          </p>
          <Link
            href={`/admin/campaigns/${longestWaiting.campaignId}/candidates?status=in_pipeline&sort=waiting`}
            className={`text-xs font-medium underline mt-2 inline-block ${subtextColor} hover:opacity-80`}
          >
            View candidates →
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 p-1 rounded-md hover:bg-black/5 ${textColor}`}
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
