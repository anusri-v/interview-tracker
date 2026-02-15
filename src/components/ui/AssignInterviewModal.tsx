"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type Interviewer = { id: string; name: string | null; email: string };

export default function AssignInterviewModal({
  open,
  onClose,
  candidateId,
  candidateName,
  round,
  interviewers,
  existingInterviewerIds,
  completedInterviewerIds = [],
  assignInterviewer,
}: {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  round: number;
  interviewers: Interviewer[];
  existingInterviewerIds: string[];
  completedInterviewerIds?: string[];
  assignInterviewer: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  // Filter out interviewers with active (non-completed) interviews for this candidate
  const activeInterviewerIds = existingInterviewerIds.filter(
    (id) => !completedInterviewerIds.includes(id)
  );

  const availableInterviewers = interviewers.filter(
    (u) => !activeInterviewerIds.includes(u.id)
  );

  const filteredInterviewers = availableInterviewers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q)
    );
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    const formData = new FormData();
    formData.set("interviewerId", selectedId);
    const scheduledAt = formRef.current?.querySelector<HTMLInputElement>(
      'input[name="scheduledAt"]'
    )?.value;
    if (scheduledAt) formData.set("scheduledAt", scheduledAt);
    startTransition(async () => {
      await assignInterviewer(candidateId, formData);
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Interview">
      <p className="text-sm text-foreground-secondary mb-4">
        Assigning <strong className="text-foreground">Round {round}</strong> for{" "}
        <strong className="text-foreground">{candidateName}</strong>
      </p>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Select Interviewer
          </label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground mb-2 text-sm"
          />
          <div className="max-h-48 overflow-y-auto border border-border rounded bg-card">
            {filteredInterviewers.length === 0 ? (
              <p className="text-xs text-foreground-muted p-3">
                No interviewers found.
              </p>
            ) : (
              filteredInterviewers.map((u) => {
                const alreadyInterviewed = completedInterviewerIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors ${
                      selectedId === u.id ? "bg-surface" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="interviewerRadio"
                      value={u.id}
                      checked={selectedId === u.id}
                      onChange={() => setSelectedId(u.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      {u.name || u.email}
                      {u.name && (
                        <span className="text-foreground-muted ml-1">
                          ({u.email})
                        </span>
                      )}
                    </span>
                    {alreadyInterviewed && (
                      <span className="ml-auto text-xs bg-[#FFDDA4] text-[#D97706] border border-[#F59E0B] rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                        already interviewed
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="assign-scheduledAt"
            className="block text-sm font-medium mb-1 text-foreground"
          >
            Scheduled at (optional)
          </label>
          <input
            id="assign-scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !selectedId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? "Assigning..." : "Assign Interview"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
