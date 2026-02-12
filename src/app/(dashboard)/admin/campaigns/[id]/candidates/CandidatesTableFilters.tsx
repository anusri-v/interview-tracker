"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

type StatusFilter = "in_pipeline" | "rejected" | "selected" | "all";

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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="candidates-search" className="text-sm text-gray-600 dark:text-gray-400">
          Search by name
        </label>
        <input
          id="candidates-search"
          type="search"
          placeholder="Name or email…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              updateFilters(searchValue, statusFilter);
            }
          }}
          onBlur={() => updateFilters(searchValue, statusFilter)}
          className="text-sm border rounded px-2 py-1.5 w-48 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="candidates-status" className="text-sm text-gray-600 dark:text-gray-400">
          Status
        </label>
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
          className="text-sm border rounded px-2 py-1.5 dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value="all">All</option>
          <option value="in_pipeline">In pipeline</option>
          <option value="rejected">Rejected</option>
          <option value="selected">Hired</option>
        </select>
      </div>
    </div>
  );
}
