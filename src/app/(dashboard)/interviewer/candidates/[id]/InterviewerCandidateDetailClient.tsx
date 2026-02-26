"use client";

import { useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillRatingsDisplay from "@/components/ui/SkillRatingsDisplay";
import EditFeedbackModal from "@/components/ui/EditFeedbackModal";

type InterviewData = {
  id: string;
  interviewerId: string;
  interviewerName: string;
  completedAt: string | null;
  result: string | null;
  feedbackText: string | null;
  pointers: string | null;
  skillRatings: Array<{ skill: string; rating: number }>;
};

export default function InterviewerCandidateDetailClient({
  candidateName,
  interviews,
  currentUserId,
  hasActiveInterviews,
}: {
  candidateName: string;
  interviews: InterviewData[];
  currentUserId: string;
  hasActiveInterviews: boolean;
}) {
  const [editInterview, setEditInterview] = useState<InterviewData | null>(null);

  return (
    <>
      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
        {interviews.length === 0 ? (
          <p className="text-foreground-muted text-sm">No completed interviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {interviews.map((i) => {
              const canEdit =
                i.result === "WEAK_HIRE" &&
                i.interviewerId === currentUserId &&
                !hasActiveInterviews;

              return (
                <li key={i.id} className="border border-border rounded-xl bg-card p-4 text-sm text-foreground">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{i.interviewerName}</p>
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
                    <p className="mt-1 text-foreground-muted">Pointers: {i.pointers}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
