"use client";

import Link from "next/link";
import type { CandidateWithInterviews } from "./CandidatesPageClient";

type SubSection = {
  label: string;
  candidates: CandidateWithInterviews[];
  pillClass: string;
};

export default function OverallView({
  candidates,
  campaignId,
}: {
  candidates: CandidateWithInterviews[];
  campaignId: string;
}) {
  const pipelineCandidates = candidates.filter((c) => c.status === "in_pipeline");
  const selectedCandidates = candidates.filter((c) => c.status === "selected");
  const rejectedCandidates = candidates.filter((c) => c.status === "rejected");

  // Group pipeline candidates by round
  const roundGroups: Record<number, CandidateWithInterviews[]> = {};
  const rejectedInRound: Record<number, CandidateWithInterviews[]> = {};
  let maxRound = 0;

  for (const c of pipelineCandidates) {
    const passedRounds = c.interviews.filter(
      (i) => i.status === "completed" && i.feedback && (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
    ).length;
    const round = passedRounds + 1;
    if (round > maxRound) maxRound = round;
    if (!roundGroups[round]) roundGroups[round] = [];
    roundGroups[round].push(c);
  }

  for (const c of rejectedCandidates) {
    const passedRounds = c.interviews.filter(
      (i) => i.status === "completed" && i.feedback && (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
    ).length;
    const round = passedRounds + 1;
    if (round > maxRound) maxRound = round;
    if (!rejectedInRound[round]) rejectedInRound[round] = [];
    rejectedInRound[round].push(c);
  }

  if (pipelineCandidates.length > 0 && maxRound === 0) maxRound = 1;

  function categorize(candidates: CandidateWithInterviews[]) {
    const notAssigned: CandidateWithInterviews[] = [];
    const scheduled: CandidateWithInterviews[] = [];
    const ongoing: CandidateWithInterviews[] = [];

    for (const c of candidates) {
      const hasOngoing = c.interviews.some((i) => i.status === "ongoing");
      const hasScheduled = c.interviews.some((i) => i.status === "scheduled");
      if (hasOngoing) {
        ongoing.push(c);
      } else if (hasScheduled) {
        scheduled.push(c);
      } else {
        notAssigned.push(c);
      }
    }
    return { notAssigned, scheduled, ongoing };
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => {
        const roundCandidates = roundGroups[round] || [];
        const rejectedHere = rejectedInRound[round] || [];
        const { notAssigned, scheduled, ongoing } = categorize(roundCandidates);

        const subSections: SubSection[] = [
          {
            label: "Not Yet Assigned",
            candidates: notAssigned,
            pillClass: "border border-primary text-primary bg-transparent",
          },
          {
            label: "Scheduled",
            candidates: scheduled,
            pillClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
          },
          {
            label: "Ongoing",
            candidates: ongoing,
            pillClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
          },
          {
            label: "Rejected",
            candidates: rejectedHere,
            pillClass: "border border-danger text-danger bg-transparent line-through",
          },
        ];

        const totalCount = roundCandidates.length + rejectedHere.length;

        return (
          <div key={round} className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Round {round}
              <span className="text-foreground-muted font-normal ml-2">({totalCount})</span>
            </h3>
            {totalCount === 0 ? (
              <p className="text-sm text-foreground-muted">No candidates in this round.</p>
            ) : (
              <div className="space-y-3">
                {subSections.map((section) => {
                  if (section.candidates.length === 0) return null;
                  return (
                    <div key={section.label}>
                      <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1.5">
                        {section.label}
                        <span className="ml-1">({section.candidates.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.candidates.map((c) => (
                          <Link
                            key={c.id}
                            href={`/admin/campaigns/${campaignId}/candidates/${c.id}`}
                            className={`rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity ${section.pillClass}`}
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {pipelineCandidates.length === 0 && selectedCandidates.length === 0 && rejectedCandidates.length === 0 && (
        <p className="text-foreground-muted py-4">No candidates yet.</p>
      )}

      {selectedCandidates.length > 0 && (
        <div className="border border-success/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-success mb-3">
            Selected Candidates
            <span className="text-foreground-muted font-normal ml-2">({selectedCandidates.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedCandidates.map((c) => (
              <Link
                key={c.id}
                href={`/admin/campaigns/${campaignId}/candidates/${c.id}`}
                className="border border-success text-success bg-transparent rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
