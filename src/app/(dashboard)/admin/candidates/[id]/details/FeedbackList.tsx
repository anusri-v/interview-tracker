"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";
import EditFeedbackModal from "@/components/ui/EditFeedbackModal";

export type InterviewFeedbackItem = {
  id: string;
  interviewerId?: string;
  round?: number;
  interviewerName: string;
  completedAt: string | null;
  result: string | null;
  feedbackText: string | null;
  pointers: string | null;
  skillRatings: Array<{ skill: string; rating: number }>;
  nextRoundAssigned?: boolean;
  panelGroupId?: string | null;
  panelSiblingNames?: string[];
};

type GroupedFeedback = InterviewFeedbackItem & {
  allPanelistNames?: string[];
};

export default function FeedbackList({
  interviews,
  candidateName,
  currentUserId,
}: {
  interviews: InterviewFeedbackItem[];
  candidateName: string;
  currentUserId?: string;
}) {
  const [editInterview, setEditInterview] = useState<InterviewFeedbackItem | null>(null);

  // Group panel interviews into a single entry per panelGroupId
  const grouped = useMemo(() => {
    const result: GroupedFeedback[] = [];
    const seenPanelGroups = new Set<string>();
    let roundCounter = 0;

    for (const i of interviews) {
      if (i.panelGroupId) {
        if (seenPanelGroups.has(i.panelGroupId)) continue;
        seenPanelGroups.add(i.panelGroupId);
        const siblings = interviews.filter((s) => s.panelGroupId === i.panelGroupId);
        roundCounter++;
        result.push({
          ...i,
          round: roundCounter,
          allPanelistNames: siblings.map((s) => s.interviewerName),
        });
      } else {
        roundCounter++;
        result.push({ ...i, round: roundCounter });
      }
    }
    return result;
  }, [interviews]);

  if (interviews.length === 0) {
    return <p className="text-foreground-muted text-sm">No completed interviews yet.</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {grouped.map((i) => {
          const canEdit =
            i.result === "WEAK_HIRE" &&
            !i.nextRoundAssigned &&
            (!currentUserId || i.interviewerId === currentUserId);

          const isPanel = !!(i.allPanelistNames && i.allPanelistNames.length > 1);

          return (
            <li
              key={i.id}
              className="border border-border rounded-xl bg-card p-4 text-sm text-foreground"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium flex items-center gap-2">
                  {isPanel && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-full px-2 py-0.5 font-medium">Panel</span>
                  )}
                  {i.round != null && <>Round {i.round} &mdash; </>}
                  {isPanel ? i.allPanelistNames!.join(", ") : i.interviewerName}
                </p>
                <div className="flex items-center gap-3">
                  {i.completedAt && (
                    <span className="text-xs text-foreground-muted">
                      {new Date(i.completedAt).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      {new Date(i.completedAt).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setEditInterview(i)}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {i.result && (
                    <StatusBadge variant={i.result.toLowerCase() as any} />
                  )}
                </div>
              </div>
              {i.feedbackText && (
                <p className="mt-2 text-foreground-secondary">{i.feedbackText}</p>
              )}
              <SkillRatingsDisplay skillRatings={i.skillRatings} />
              {i.pointers && (
                <p className="mt-1 text-foreground-muted">
                  Pointers for next interviewer: {i.pointers}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {editInterview && (
        <EditFeedbackModal
          open
          onClose={() => setEditInterview(null)}
          interviewId={editInterview.id}
          candidateName={candidateName}
          currentResult={editInterview.result ?? "WEAK_HIRE"}
          currentFeedback={editInterview.feedbackText ?? ""}
          currentPointers={editInterview.pointers}
          currentSkillRatings={editInterview.skillRatings}
        />
      )}
    </>
  );
}
