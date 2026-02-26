"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useEffect, useRef } from "react";

type DisplayStatus =
  | "in_pipeline"
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing"
  | "no_show";

type SortOption = "default" | "waiting";

const STATUS_OPTIONS: { value: DisplayStatus; label: string }[] = [
  { value: "in_pipeline", label: "In Pipeline" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "interview_ongoing", label: "Interview Ongoing" },
  { value: "rejected", label: "Rejected" },
  { value: "selected", label: "Selected" },
  { value: "no_show", label: "No Show" },
];

export default function CandidatesTableFilters({
  campaignId,
  search,
  statusFilter,
  sort,
  roundFilter = "all",
}: {
  campaignId: string;
  search: string;
  statusFilter: string;
  sort: SortOption;
  roundFilter?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  useEffect(() => setSearchValue(search), [search]);

  const [currentRound, setCurrentRound] = useState(roundFilter);
  useEffect(() => setCurrentRound(roundFilter), [roundFilter]);

  const selectedStatuses: DisplayStatus[] =
    statusFilter === "all" ? [] : (statusFilter.split(",") as DisplayStatus[]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateFilters(newSearch: string, newStatuses: DisplayStatus[], newSort: SortOption, newRound?: string) {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatuses.length > 0) params.set("status", newStatuses.join(","));
    if (newSort !== "default") params.set("sort", newSort);
    const round = newRound ?? currentRound;
    if (round !== "all") params.set("round", round);
    const q = params.toString();
    startTransition(() => {
      router.push(`${pathname}${q ? `?${q}` : ""}`);
    });
  }

  function toggleStatus(status: DisplayStatus) {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    updateFilters(searchValue, newStatuses, sort);
  }

  const statusLabel =
    selectedStatuses.length === 0
      ? "All Statuses"
      : selectedStatuses.length === 1
        ? STATUS_OPTIONS.find((o) => o.value === selectedStatuses[0])?.label ?? selectedStatuses[0]
        : `${selectedStatuses.length} statuses`;

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
          placeholder="Search by name, email, or college…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              updateFilters(searchValue, selectedStatuses, sort);
            }
          }}
          onBlur={() => updateFilters(searchValue, selectedStatuses, sort)}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 w-64 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isPending}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 bg-card text-foreground cursor-pointer inline-flex items-center gap-2 relative"
        >
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {statusLabel}
          <svg className="w-3 h-3 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatuses.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatus(opt.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </button>
              );
            })}
            {selectedStatuses.length > 0 && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={() => updateFilters(searchValue, [], sort)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground-muted hover:bg-surface transition-colors"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        <select
          id="candidates-round"
          value={currentRound}
          onChange={(e) => {
            setCurrentRound(e.target.value);
            updateFilters(searchValue, selectedStatuses, sort, e.target.value);
          }}
          disabled={isPending}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 bg-card text-foreground appearance-none cursor-pointer"
        >
          <option value="all">All Rounds</option>
          <option value="1">Round 1</option>
          <option value="2">Round 2</option>
          <option value="3">Round 3</option>
          <option value="4">Round 4</option>
          <option value="5">Round 5</option>
        </select>
      </div>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />
        </svg>
        <select
          id="candidates-sort"
          value={sort}
          onChange={(e) =>
            updateFilters(searchValue, selectedStatuses, e.target.value as SortOption)
          }
          disabled={isPending}
          className="text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 bg-card text-foreground appearance-none cursor-pointer"
        >
          <option value="default">Newest First</option>
          <option value="waiting">Longest Waiting</option>
        </select>
      </div>
    </div>
  );
}
