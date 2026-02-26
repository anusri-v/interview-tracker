"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import CandidatesTableFilters from "./CandidatesTableFilters";
import OverallView from "./OverallView";
import StatusBadge from "@/components/ui/StatusBadge";
import EditCandidateModal from "@/components/ui/EditCandidateModal";
import HireCandidateModal from "@/components/ui/HireCandidateModal";
import AssignInterviewModal from "@/components/ui/AssignInterviewModal";
import AddCandidateModal from "@/components/ui/AddCandidateModal";
import UploadCsvModal from "@/components/ui/UploadCsvModal";
import UploadCsvWithHistoryModal from "@/components/ui/UploadCsvWithHistoryModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReassignInterviewModal from "@/components/ui/ReassignInterviewModal";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

export type CandidateWithInterviews = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  department: string | null;
  resumeLink: string | null;
  currentRole: string | null;
  hiredRole: string | null;
  status: string;
  interviews: {
    id: string;
    status: string;
    interviewerId: string;
    interviewer?: { name: string | null; email: string };
    feedback: { result: string } | null;
  }[];
  displayStatus: string;
  waitingHours?: number | null;
};

type Interviewer = { id: string; name: string | null; email: string; hasOngoing: boolean; hasScheduled: boolean };

type InterviewerSlot = { id: string; interviewerId: string; startTime: string };

type ModalState =
  | { type: "none" }
  | { type: "edit"; candidate: CandidateWithInterviews }
  | { type: "hire"; candidate: CandidateWithInterviews }
  | { type: "assign"; candidate: CandidateWithInterviews }
  | { type: "addCandidate" }
  | { type: "uploadCsv" }
  | { type: "rescheduleNoShow"; candidate: CandidateWithInterviews }
  | { type: "rejectNoShow"; candidate: CandidateWithInterviews }
  | { type: "cancelInterview"; candidate: CandidateWithInterviews }
  | { type: "reassign"; interviewId: string; candidate: CandidateWithInterviews };

export default function CandidatesPageClient({
  campaignId,
  campaignType,
  isActive,
  readOnly = false,
  candidates,
  allCandidates,
  interviewers,
  search,
  statusFilter,
  updateCandidateDetails,
  updateCandidateStatus,
  assignInterviewer,
  createCandidate,
  currentPage = 1,
  totalPages = 1,
  totalFiltered = 0,
  interviewerSlots = [],
  reassignInterviewer,
  cancelScheduledInterview,
  rescheduleNoShow,
  rejectNoShow,
  sort = "default",
  roundFilter = "all",
}: {
  campaignId: string;
  campaignType: string;
  isActive: boolean;
  readOnly?: boolean;
  candidates: CandidateWithInterviews[];
  allCandidates: CandidateWithInterviews[];
  interviewers: Interviewer[];
  interviewerSlots?: InterviewerSlot[];
  search: string;
  statusFilter: string;
  updateCandidateDetails: (candidateId: string, formData: FormData) => Promise<void>;
  updateCandidateStatus: (candidateId: string, formData: FormData) => Promise<void>;
  assignInterviewer: (candidateId: string, formData: FormData) => Promise<void>;
  createCandidate: (campaignId: string, formData: FormData) => Promise<void>;
  currentPage?: number;
  totalPages?: number;
  totalFiltered?: number;
  reassignInterviewer?: (interviewId: string, formData: FormData) => Promise<void>;
  cancelScheduledInterview?: (candidateId: string) => Promise<void>;
  rescheduleNoShow?: (candidateId: string) => Promise<void>;
  rejectNoShow?: (candidateId: string) => Promise<void>;
  sort?: string;
  roundFilter?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useAutoRefresh(30000);

  const view = searchParams.get("view") === "overall" ? "overall" : "table";
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [actionPending, startActionTransition] = useTransition();
  const isExperienced = campaignType === "experienced";

  function setView(newView: "table" | "overall") {
    const params = new URLSearchParams(searchParams.toString());
    if (newView === "overall") {
      params.set("view", "overall");
    } else {
      params.delete("view");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeModal() {
    setModal({ type: "none" });
  }

  function getCompletedInterviewCount(c: CandidateWithInterviews) {
    return c.interviews.filter((i) => i.status === "completed").length;
  }

  function getCurrentRound(c: CandidateWithInterviews) {
    const passedRounds = c.interviews.filter(
      (i) => i.status === "completed" && i.feedback && (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
    ).length;
    return passedRounds + 1;
  }

  function formatWaitTime(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function getExistingInterviewerIds(c: CandidateWithInterviews) {
    return c.interviews
      .filter((i) => !(i.status === "completed" && i.feedback?.result === "NO_SHOW"))
      .map((i) => i.interviewerId);
  }

  function getCompletedInterviewerIds(c: CandidateWithInterviews) {
    return c.interviews
      .filter((i) => i.status === "completed" && i.feedback?.result !== "NO_SHOW")
      .map((i) => i.interviewerId);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Candidates</h1>
        {!readOnly && (
          <div className="flex gap-3">
            {isActive && (
              <button
                onClick={() => setModal({ type: "addCandidate" })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Candidate
              </button>
            )}
            <a
              href={`/api/admin/campaigns/${campaignId}/candidates/export`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              download
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </a>
            {isActive && (
              <button
                onClick={() => setModal({ type: "uploadCsv" })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {!readOnly && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setView("table")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "table"
                ? "text-primary border-primary"
                : "text-foreground-muted border-transparent hover:text-foreground"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setView("overall")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "overall"
                ? "text-primary border-primary"
                : "text-foreground-muted border-transparent hover:text-foreground"
            }`}
          >
            Overall View
          </button>
        </div>
      )}

      {/* Table View */}
      {(readOnly || view === "table") && (
        <>
          <CandidatesTableFilters
            campaignId={campaignId}
            search={search}
            statusFilter={statusFilter as any}
            sort={sort as any}
            roundFilter={roundFilter}
          />

          {candidates.length === 0 ? (
            <p className="text-foreground-muted py-4">
              {allCandidates.length === 0
                ? readOnly ? "No candidates yet." : "No candidates yet. Add one or upload a CSV."
                : "No candidates match your search or filter."}
            </p>
          ) : (
            <div className="border border-border rounded-xl overflow-x-auto overflow-y-visible bg-card">
              <table className="text-base border-collapse" style={{ minWidth: "1100px" }}>
                <thead className="bg-surface">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Name</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Round</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Phone</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Email</th>
                    {!isExperienced && <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">College</th>}
                    {!isExperienced && <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Department</th>}
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Resume</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Current Role</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap">Hired Role</th>
                    {isActive && !readOnly && <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-foreground-muted border-b border-border whitespace-nowrap sticky right-0 bg-surface z-10">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={readOnly ? `/interviewer/candidates/${c.id}` : `/admin/candidates/${c.id}/details`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {c.name}
                          </Link>
                          {c.waitingHours != null && c.waitingHours > 0 && (
                            <span className="relative group">
                              <svg
                                className="w-4 h-4 text-foreground-muted cursor-help"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                                />
                              </svg>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-xs font-medium text-white bg-gray-900 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                                Waiting: {formatWaitTime(c.waitingHours)}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge variant={c.displayStatus as any} />
                      </td>
                      <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{getCurrentRound(c)}</td>
                      <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.phone ?? "—"}</td>
                      <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.email}</td>
                      {!isExperienced && <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.college ?? "—"}</td>}
                      {!isExperienced && <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.department ?? "—"}</td>}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {c.resumeLink ? (
                          <a
                            href={c.resumeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover font-medium transition-colors"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-foreground-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.currentRole ?? "—"}</td>
                      <td className="px-5 py-4 text-foreground-secondary whitespace-nowrap">{c.hiredRole ?? "—"}</td>
                      {isActive && !readOnly && (
                        <td className="px-5 py-4 whitespace-nowrap sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          {c.displayStatus === "no_show" ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  startActionTransition(async () => {
                                    await rescheduleNoShow?.(c.id);
                                    router.refresh();
                                  });
                                }}
                                disabled={actionPending}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => {
                                  startActionTransition(async () => {
                                    await rejectNoShow?.(c.id);
                                    router.refresh();
                                  });
                                }}
                                disabled={actionPending}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-danger text-white hover:opacity-90 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : c.status !== "rejected" && (
                          <div className="flex items-center gap-3">
                            {/* Edit (pencil) */}
                            <button
                              onClick={() => setModal({ type: "edit", candidate: c })}
                              className="text-foreground-secondary hover:text-primary transition-colors"
                              title="Edit Candidate"
                            >
                              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            {/* Assign interview (clipboard) — hide when selected, interview ongoing, interview scheduled, or no_show */}
                            {c.displayStatus !== "selected" && c.displayStatus !== "interview_ongoing" && c.displayStatus !== "interview_scheduled" && c.displayStatus !== "no_show" && (
                              <button
                                onClick={() => setModal({ type: "assign", candidate: c })}
                                className="text-foreground-secondary hover:text-primary transition-colors"
                                title="Assign Interview"
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                                </svg>
                              </button>
                            )}
                            {/* Reassign interview — for scheduled/ongoing */}
                            {(c.displayStatus === "interview_scheduled" || c.displayStatus === "interview_ongoing") && (() => {
                              const activeInterview = c.interviews.find(
                                (i) => i.status === "scheduled" || i.status === "ongoing"
                              );
                              if (!activeInterview) return null;
                              return (
                                <button
                                  onClick={() => setModal({ type: "reassign", interviewId: activeInterview.id, candidate: c })}
                                  className="text-foreground-secondary hover:text-primary transition-colors"
                                  title="Reassign Interview"
                                >
                                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                  </svg>
                                </button>
                              );
                            })()}
                            {/* Cancel scheduled interview — experienced campaigns only */}
                            {isExperienced && c.displayStatus === "interview_scheduled" && (
                              <button
                                onClick={() => setModal({ type: "cancelInterview", candidate: c })}
                                className="text-foreground-secondary hover:text-danger transition-colors"
                                title="Cancel Interview"
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            {/* Hire (checkmark) — only for in_pipeline with no active interviews */}
                            {c.status === "in_pipeline" && !c.interviews.some((i) => i.status === "scheduled" || i.status === "ongoing") && (
                              <button
                                onClick={() => setModal({ type: "hire", candidate: c })}
                                className="text-foreground-secondary hover:text-primary transition-colors"
                                title="Hire Candidate"
                              >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-foreground-muted">
              {totalFiltered <= 20
                ? `Showing ${totalFiltered} candidate${totalFiltered !== 1 ? "s" : ""}`
                : `Showing ${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, totalFiltered)} of ${totalFiltered}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-foreground-secondary">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Overall View */}
      {!readOnly && view === "overall" && <OverallView candidates={allCandidates} campaignId={campaignId} />}

      {/* Modals */}
      {!readOnly && (
        <>
          {modal.type === "edit" && (
            <EditCandidateModal
              open
              onClose={closeModal}
              candidate={modal.candidate}
              campaignType={campaignType}
              updateCandidateDetails={updateCandidateDetails}
            />
          )}
          {modal.type === "hire" && (
            <HireCandidateModal
              open
              onClose={closeModal}
              candidateId={modal.candidate.id}
              candidateName={modal.candidate.name}
              updateCandidateStatus={updateCandidateStatus}
            />
          )}
          {modal.type === "assign" && (
            <AssignInterviewModal
              open
              onClose={closeModal}
              candidateId={modal.candidate.id}
              candidateName={modal.candidate.name}
              round={getCompletedInterviewCount(modal.candidate) + 1}
              interviewers={interviewers}
              existingInterviewerIds={getExistingInterviewerIds(modal.candidate)}
              completedInterviewerIds={getCompletedInterviewerIds(modal.candidate)}
              assignInterviewer={assignInterviewer}
              campaignType={campaignType}
              interviewerSlots={interviewerSlots}
            />
          )}
          {modal.type === "addCandidate" && (
            <AddCandidateModal
              open
              onClose={closeModal}
              campaignId={campaignId}
              campaignType={campaignType}
              createCandidate={createCandidate}
            />
          )}
          {modal.type === "uploadCsv" && (
            isExperienced ? (
              <UploadCsvWithHistoryModal
                open
                onClose={closeModal}
                campaignId={campaignId}
              />
            ) : (
              <UploadCsvModal
                open
                onClose={closeModal}
                campaignId={campaignId}
              />
            )
          )}
          {modal.type === "reassign" && reassignInterviewer && (() => {
            const activeInterview = modal.candidate.interviews.find(
              (i) => i.id === modal.interviewId
            );
            const currentInterviewerName = activeInterview?.interviewer
              ? (activeInterview.interviewer.name || activeInterview.interviewer.email)
              : interviewers.find((u) => u.id === activeInterview?.interviewerId)?.name || "Unknown";
            return (
              <ReassignInterviewModal
                open
                onClose={closeModal}
                interviewId={modal.interviewId}
                candidateName={modal.candidate.name}
                currentInterviewerId={activeInterview?.interviewerId ?? ""}
                currentInterviewerName={currentInterviewerName}
                interviewers={interviewers}
                reassignInterviewer={reassignInterviewer}
              />
            );
          })()}
          {modal.type === "cancelInterview" && (
            <ConfirmDialog
              open
              title="Cancel Interview"
              message={<>Are you sure you want to cancel the scheduled interview for <strong>{modal.candidate.name}</strong>? This action cannot be undone.</>}
              confirmLabel="Yes, cancel interview"
              onConfirm={() => {
                const candidateId = modal.candidate.id;
                closeModal();
                startActionTransition(async () => {
                  await cancelScheduledInterview?.(candidateId);
                  router.refresh();
                });
              }}
              onCancel={closeModal}
              loading={actionPending}
            />
          )}
        </>
      )}
    </div>
  );
}
