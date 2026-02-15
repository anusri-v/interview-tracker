"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import AssignInterviewModal from "@/components/ui/AssignInterviewModal";

type CandidateInfo = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  department: string | null;
  resumeLink: string | null;
  status: string;
};

type CompletedInterview = {
  id: string;
  round: number;
  interviewerName: string;
  status: string;
  result: string | null;
  feedbackText: string | null;
  pointers: string | null;
};

type ActiveInterview = {
  id: string;
  interviewerName: string;
  status: string;
  scheduledAt: string | null;
};

type Interviewer = { id: string; name: string | null; email: string };

export default function CandidateDetailClient({
  campaignId,
  campaignName,
  candidate,
  completedInterviews,
  activeInterviews,
  canAssign,
  interviewers,
  existingInterviewerIds,
  completedInterviewerIds,
  nextRound,
  assignInterviewer,
}: {
  campaignId: string;
  campaignName: string;
  candidate: CandidateInfo;
  completedInterviews: CompletedInterview[];
  activeInterviews: ActiveInterview[];
  canAssign: boolean;
  interviewers: Interviewer[];
  existingInterviewerIds: string[];
  completedInterviewerIds: string[];
  nextRound: number;
  assignInterviewer: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const displayStatus =
    candidate.status === "rejected"
      ? "rejected"
      : candidate.status === "selected"
      ? "selected"
      : activeInterviews.some((i) => i.status === "ongoing")
      ? "interview_ongoing"
      : activeInterviews.some((i) => i.status === "scheduled")
      ? "interview_scheduled"
      : "in_pipeline";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/admin/campaigns/${campaignId}/candidates?view=overall`}
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to {campaignName}
      </Link>

      {/* Candidate Info Card */}
      <div className="border border-border rounded-xl p-6 bg-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{candidate.name}</h1>
            <p className="text-foreground-secondary mt-1">{candidate.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant={displayStatus as any} />
            {canAssign && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Assign Interview
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Phone</p>
            <p className="text-sm text-foreground mt-1">{candidate.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">College</p>
            <p className="text-sm text-foreground mt-1">{candidate.college || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Department</p>
            <p className="text-sm text-foreground mt-1">{candidate.department || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Resume</p>
            {candidate.resumeLink ? (
              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary-hover font-medium mt-1 inline-block transition-colors"
              >
                View Resume
              </a>
            ) : (
              <p className="text-sm text-foreground mt-1">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming/Ongoing Interviews */}
      {activeInterviews.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Upcoming / Ongoing Interviews</h2>
          <div className="space-y-3">
            {activeInterviews.map((interview) => (
              <div
                key={interview.id}
                className="border border-border rounded-lg p-4 bg-card flex items-center justify-between flex-wrap gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Interviewer: {interview.interviewerName}
                  </p>
                  {interview.scheduledAt && (
                    <p className="text-xs text-foreground-muted mt-1">
                      Scheduled: {new Date(interview.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <StatusBadge variant={interview.status as any} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Interviews */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Past Interviews</h2>
        {completedInterviews.length === 0 ? (
          <p className="text-sm text-foreground-muted">No completed interviews yet.</p>
        ) : (
          <div className="space-y-4">
            {completedInterviews.map((interview) => (
              <div
                key={interview.id}
                className="border border-border rounded-lg p-4 bg-card"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      Round {interview.round}
                    </span>
                    <span className="text-sm text-foreground-secondary">
                      {interview.interviewerName}
                    </span>
                  </div>
                  {interview.result && (
                    <StatusBadge variant={interview.result.toLowerCase() as any} />
                  )}
                </div>
                {interview.feedbackText && (
                  <div className="mb-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                      Feedback
                    </p>
                    <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                      {interview.feedbackText}
                    </p>
                  </div>
                )}
                {interview.pointers && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                      Pointers for Next Interviewer
                    </p>
                    <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                      {interview.pointers}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Interview Modal */}
      {showAssignModal && (
        <AssignInterviewModal
          open
          onClose={() => setShowAssignModal(false)}
          candidateId={candidate.id}
          candidateName={candidate.name}
          round={nextRound}
          interviewers={interviewers}
          existingInterviewerIds={existingInterviewerIds}
          completedInterviewerIds={completedInterviewerIds}
          assignInterviewer={assignInterviewer}
        />
      )}
    </div>
  );
}
