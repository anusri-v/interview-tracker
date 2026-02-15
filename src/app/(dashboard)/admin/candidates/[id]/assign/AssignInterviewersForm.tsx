"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Interviewer = { id: string; name: string | null; email: string };

export default function AssignInterviewersForm({
  candidateId,
  interviewers,
  existingInterviewerIds,
  assignInterviewers,
  error,
}: {
  candidateId: string;
  interviewers: Interviewer[];
  existingInterviewerIds: string[];
  assignInterviewers: (candidateId: string, formData: FormData) => Promise<void>;
  error?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState<boolean>(!!error);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!error) return;
    setShowToast(true);
    const id = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(id);
  }, [error]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const selected = form.querySelectorAll<HTMLInputElement>('input[name="interviewerId"]:checked');
    if (selected.length === 0) return;
    setShowConfirm(true);
  }

  function onConfirm() {
    if (!formRef.current) return;
    setShowConfirm(false);
    startTransition(() => assignInterviewers(candidateId, new FormData(formRef.current!)));
  }

  return (
    <>
      {showToast && error && (
        <div className="fixed right-4 top-16 z-50 max-w-sm rounded border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger shadow-lg">
          {error}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">Interviewers</label>
          <div className="border border-border rounded divide-y divide-border max-h-48 overflow-y-auto bg-card">
            {interviewers.length === 0 ? (
              <p className="p-3 text-sm text-foreground-muted">No interviewers in the system yet.</p>
            ) : (
              interviewers.map((u) => {
                const alreadyAssigned = existingInterviewerIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 p-3 cursor-pointer text-foreground ${alreadyAssigned ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      name="interviewerId"
                      value={u.id}
                      disabled={alreadyAssigned}
                      className="rounded border-border text-primary"
                    />
                    <span className="text-sm">
                      {u.name || u.email} {alreadyAssigned && "(already assigned)"}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div>
          <label htmlFor="scheduledAt" className="block text-sm font-medium mb-1 text-foreground">
            Scheduled at (optional)
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || interviewers.length === 0}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Assigning…" : "Assign"}
        </button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        title="Assign interview"
        message="Are you sure you want to assign the selected interviewer(s) to this candidate? Interview slots will be created."
        confirmLabel="Yes, assign"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isPending}
      />
    </>
  );
}
