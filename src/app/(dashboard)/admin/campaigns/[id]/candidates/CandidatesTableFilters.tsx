"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

type StatusFilter =
  | "in_pipeline"
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing"
  | "all";

export default function CandidatesTableFilters({
  campaignId,
  search,
  statusFilter,
}: {
  campaignId: string;
  search: string;
  statusFilter: StatusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  useEffect(() => setSearchValue(search), [search]);

  function updateFilters(newSearch: string, newStatus: StatusFilter) {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatus !== "all") params.set("status", newStatus);
    const q = params.toString();
    startTransition(() => {
      router.push(`${pathname}${q ? `?${q}` : ""}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          id="candidates-search"
          type="search"
          placeholder="Search by name or email…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              updateFilters(searchValue, statusFilter);
            }
          }}
          onBlur={() => updateFilters(searchValue, statusFilter)}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 w-64 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <select
          id="candidates-status"
          value={statusFilter}
          onChange={(e) =>
            updateFilters(
              searchValue,
              e.target.value as StatusFilter
            )
          }
          disabled={isPending}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 bg-card text-foreground appearance-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="in_pipeline">In Pipeline</option>
          <option value="interview_scheduled">Interview Scheduled</option>
          <option value="interview_ongoing">Interview Ongoing</option>
          <option value="rejected">Rejected</option>
          <option value="selected">Selected</option>
        </select>
      </div>
    </div>
  );
}
