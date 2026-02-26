"use client";

import Link from "next/link";
import type { CandidateWithInterviews } from "./CandidatesPageClient";

export default function OverallView({
  candidates,
  campaignId,
}: {
  candidates: CandidateWithInterviews[];
  campaignId: string;
}) {
  // Separate candidates into pipeline, selected, and rejected
  const pipelineCandidates = candidates.filter((c) => c.status === "in_pipeline");
  const selectedCandidates = candidates.filter((c) => c.status === "selected");
  const rejectedCandidates = candidates.filter((c) => c.status === "rejected");

  // Group pipeline candidates by round
  // Round = completedInterviews with HIRE/WEAK_HIRE + 1 (the round they're currently in)
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

  // Group rejected candidates into their rejection round
  for (const c of rejectedCandidates) {
    const passedRounds = c.interviews.filter(
      (i) => i.status === "completed" && i.feedback && (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
    ).length;
    const round = passedRounds + 1;
    if (round > maxRound) maxRound = round;
    if (!rejectedInRound[round]) rejectedInRound[round] = [];
    rejectedInRound[round].push(c);
  }

  // Ensure at least round 1 exists if there are pipeline candidates
  if (pipelineCandidates.length > 0 && maxRound === 0) maxRound = 1;

  return (
    <div className="space-y-6">
      {/* Round sections */}
      {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => {
        const roundCandidates = roundGroups[round] || [];
        const rejectedHere = rejectedInRound[round] || [];
        return (
          <div key={round} className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Round {round}
              <span className="text-foreground-muted font-normal ml-2">({roundCandidates.length + rejectedHere.length})</span>
            </h3>
            {roundCandidates.length === 0 && rejectedHere.length === 0 ? (
              <p className="text-sm text-foreground-muted">No candidates in this round.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roundCandidates.map((c) => {
                  const hasActive = c.interviews.some(
                    (i) => i.status === "scheduled" || i.status === "ongoing"
                  );
                  return (
                    <Link
                      key={c.id}
                      href={`/admin/campaigns/${campaignId}/candidates/${c.id}`}
                      className={
                        hasActive
                          ? "bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                          : "border border-primary text-primary bg-transparent rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                      }
                    >
                      {c.name}
                    </Link>
                  );
                })}
                {rejectedHere.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/campaigns/${campaignId}/candidates/${c.id}`}
                    className="border border-danger text-danger bg-transparent rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity line-through"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {pipelineCandidates.length === 0 && selectedCandidates.length === 0 && rejectedCandidates.length === 0 && (
        <p className="text-foreground-muted py-4">No candidates yet.</p>
      )}

      {/* Selected Candidates */}
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
