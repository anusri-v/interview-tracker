"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type Interviewer = { id: string; name: string | null; email: string; hasOngoing?: boolean; hasScheduled?: boolean };

export default function ReassignInterviewModal({
  open,
  onClose,
  interviewId,
  candidateName,
  currentInterviewerId,
  currentInterviewerName,
  interviewers,
  reassignInterviewer,
}: {
  open: boolean;
  onClose: () => void;
  interviewId: string;
  candidateName: string;
  currentInterviewerId: string;
  currentInterviewerName: string;
  interviewers: Interviewer[];
  reassignInterviewer: (interviewId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const availableInterviewers = interviewers.filter(
    (u) => u.id !== currentInterviewerId
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
    startTransition(async () => {
      await reassignInterviewer(interviewId, formData);
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Reassign Interview">
      <p className="text-sm text-foreground-secondary mb-4">
        Reassigning interview for{" "}
        <strong className="text-foreground">{candidateName}</strong>
      </p>
      <p className="text-sm text-foreground-secondary mb-4">
        Current interviewer:{" "}
        <strong className="text-foreground">{currentInterviewerName}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Select New Interviewer
          </label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground mb-2 text-sm"
          />
          <div className="max-h-60 overflow-y-auto border border-border rounded bg-card">
            {filteredInterviewers.length === 0 ? (
              <p className="text-xs text-foreground-muted p-3">
                No interviewers found.
              </p>
            ) : (
              filteredInterviewers.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 flex-wrap px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors ${
                    selectedId === u.id ? "bg-surface" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="interviewerRadio"
                    value={u.id}
                    checked={selectedId === u.id}
                    onChange={() => setSelectedId(u.id)}
                    className="accent-primary flex-shrink-0"
                  />
                  <span className="text-sm text-foreground truncate">
                    {u.name || u.email}
                    {u.name && (
                      <span className="text-foreground-muted ml-1">
                        ({u.email})
                      </span>
                    )}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                    {u.hasOngoing && (
                      <span className="text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                        ongoing interview
                      </span>
                    )}
                    {u.hasScheduled && !u.hasOngoing && (
                      <span className="text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                        upcoming interview
                      </span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
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
            {isPending ? "Reassigning..." : "Reassign"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
