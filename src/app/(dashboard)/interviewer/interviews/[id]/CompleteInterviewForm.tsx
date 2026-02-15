"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CompleteInterviewForm({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{ result: string; feedback: string; pointersForNextInterviewer: string } | null>(null);
  const router = useRouter();

  const RESULT_OPTIONS = [
    { value: "HIRE", label: "HIRE" },
    { value: "NO_HIRE", label: "NO HIRE" },
    { value: "WEAK_HIRE", label: "WEAK HIRE" },
  ] as const;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const result = (form.elements.namedItem("result") as HTMLSelectElement).value;
    const feedback = (form.elements.namedItem("feedback") as HTMLTextAreaElement).value.trim();
    const pointers = (form.elements.namedItem("pointersForNextInterviewer") as HTMLTextAreaElement).value.trim();
    if (!result || !feedback || !pointers) {
      setError("Please select a result and fill both feedback and pointers for next interviewer.");
      return;
    }
    if (!RESULT_OPTIONS.some((o) => o.value === result)) {
      setError("Please select a valid result.");
      return;
    }
    setPendingPayload({ result, feedback, pointersForNextInterviewer: pointers });
    setShowConfirm(true);
  }

  function onConfirm() {
    if (!pendingPayload) return;
    setShowConfirm(false);
    const { result, feedback, pointersForNextInterviewer } = pendingPayload;
    setPendingPayload(null);
    startTransition(async () => {
      const res = await fetch(`/api/interviewer/interviews/${interviewId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, feedback, pointersForNextInterviewer }),
      });
      if (!res.ok) {
        setError("Failed to submit.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-xl bg-card p-6">
      <h2 className="text-xl font-bold text-foreground tracking-tight">Complete Interview</h2>
      <div>
        <label htmlFor="result" className="block text-sm font-medium mb-1 text-foreground">Interview result</label>
        <select
          id="result"
          name="result"
          required
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
        >
          <option value="">Select result...</option>
          {RESULT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="feedback" className="block text-sm font-medium mb-1 text-foreground">Feedback</label>
        <textarea
          id="feedback"
          name="feedback"
          rows={4}
          required
          className="w-full border border-border rounded px-3 py-2 bg-background text-foreground placeholder:text-foreground-muted"
          placeholder="Your feedback..."
        />
      </div>
      <div>
        <label htmlFor="pointersForNextInterviewer" className="block text-sm font-medium mb-1 text-foreground">
          Pointers for next interviewer
        </label>
        <textarea
          id="pointersForNextInterviewer"
          name="pointersForNextInterviewer"
          rows={2}
          required
          className="w-full border border-border rounded px-3 py-2 bg-background text-foreground placeholder:text-foreground-muted"
          placeholder="Any pointers for the next interviewer..."
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Mark completed & submit feedback"}
      </button>
    </form>
      <ConfirmDialog
        open={showConfirm}
        title="Submit feedback"
        message={
          <>
            You are about to submit your interview feedback. This will mark the interview as completed.
            {pendingPayload?.result === "NO_HIRE" && " Submitting NO HIRE will also mark the candidate as rejected."}
            {" "}Are you sure you want to continue?
          </>
        }
        confirmLabel="Yes, submit feedback"
        onConfirm={onConfirm}
        onCancel={() => { setShowConfirm(false); setPendingPayload(null); }}
        loading={isPending}
      />
    </>
  );
}
