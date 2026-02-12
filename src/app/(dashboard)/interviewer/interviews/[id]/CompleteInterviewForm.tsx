"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteInterviewForm({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
    startTransition(async () => {
      const res = await fetch(`/api/interviewer/interviews/${interviewId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, feedback, pointersForNextInterviewer: pointers }),
      });
      if (!res.ok) {
        setError("Failed to submit.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded p-4">
      <h2 className="font-semibold">Complete interview</h2>
      <div>
        <label htmlFor="result" className="block text-sm font-medium mb-1">Interview result</label>
        <select
          id="result"
          name="result"
          required
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
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
        <label htmlFor="feedback" className="block text-sm font-medium mb-1">Feedback</label>
        <textarea
          id="feedback"
          name="feedback"
          rows={4}
          required
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
          placeholder="Your feedback..."
        />
      </div>
      <div>
        <label htmlFor="pointersForNextInterviewer" className="block text-sm font-medium mb-1">
          Pointers for next interviewer
        </label>
        <textarea
          id="pointersForNextInterviewer"
          name="pointersForNextInterviewer"
          rows={2}
          required
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
          placeholder="Any pointers for the next interviewer..."
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Mark completed & submit feedback"}
      </button>
    </form>
  );
}
