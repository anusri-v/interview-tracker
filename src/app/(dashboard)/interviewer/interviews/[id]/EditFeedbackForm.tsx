"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type SkillRating = { skill: string; rating: number };

export default function EditFeedbackForm({
  interviewId,
  currentResult,
  currentFeedback,
  currentPointers,
  currentSkillRatings,
}: {
  interviewId: string;
  currentResult: string;
  currentFeedback: string;
  currentPointers: string | null;
  currentSkillRatings: SkillRating[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    result: string;
    feedback: string;
    pointersForNextInterviewer: string;
    skillRatings: SkillRating[];
  } | null>(null);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>(currentSkillRatings);
  const router = useRouter();

  const RESULT_OPTIONS = [
    { value: "HIRE", label: "HIRE" },
    { value: "NO_HIRE", label: "NO HIRE" },
    { value: "WEAK_HIRE", label: "WEAK HIRE" },
  ];

  function addSkillRow() {
    setSkillRatings([...skillRatings, { skill: "", rating: 3 }]);
  }

  function removeSkillRow(index: number) {
    setSkillRatings(skillRatings.filter((_, i) => i !== index));
  }

  function updateSkillRating(index: number, field: "skill" | "rating", value: string | number) {
    const updated = [...skillRatings];
    if (field === "skill") {
      updated[index] = { ...updated[index], skill: value as string };
    } else {
      updated[index] = { ...updated[index], rating: value as number };
    }
    setSkillRatings(updated);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const result = (form.elements.namedItem("result") as HTMLSelectElement).value;
    const feedback = (form.elements.namedItem("feedback") as HTMLTextAreaElement).value.trim();
    const pointers = (form.elements.namedItem("pointersForNextInterviewer") as HTMLTextAreaElement).value.trim();
    if (!result || !feedback) {
      setError("Please select a result and provide feedback.");
      return;
    }
    const validSkillRatings = skillRatings.filter((sr) => sr.skill.trim());
    for (const sr of validSkillRatings) {
      if (sr.rating < 1 || sr.rating > 5) {
        setError("Skill ratings must be between 1 and 5.");
        return;
      }
    }
    setPendingPayload({ result, feedback, pointersForNextInterviewer: pointers, skillRatings: validSkillRatings });
    setShowConfirm(true);
  }

  function onConfirm() {
    if (!pendingPayload) return;
    setShowConfirm(false);
    const { result, feedback, pointersForNextInterviewer, skillRatings: sr } = pendingPayload;
    setPendingPayload(null);
    startTransition(async () => {
      const res = await fetch(`/api/interviewer/interviews/${interviewId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          feedback,
          pointersForNextInterviewer: pointersForNextInterviewer || undefined,
          skillRatings: sr.length > 0 ? sr : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-xl bg-card p-6">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Edit Feedback</h2>
        <div>
          <label htmlFor="edit-result" className="block text-sm font-medium mb-1 text-foreground">Interview result</label>
          <select
            id="edit-result"
            name="result"
            required
            defaultValue={currentResult}
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
          >
            {RESULT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-feedback" className="block text-sm font-medium mb-1 text-foreground">Feedback</label>
          <textarea
            id="edit-feedback"
            name="feedback"
            rows={4}
            required
            defaultValue={currentFeedback}
            className="w-full border border-border rounded px-3 py-2 bg-background text-foreground placeholder:text-foreground-muted"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Skill Assessments</label>
            <button
              type="button"
              onClick={addSkillRow}
              className="text-xs px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
            >
              + Add Skill
            </button>
          </div>
          {skillRatings.length > 0 && (
            <div className="space-y-2">
              {skillRatings.map((sr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sr.skill}
                    onChange={(e) => updateSkillRating(index, "skill", e.target.value)}
                    placeholder="Skill name"
                    className="flex-1 border border-border rounded px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-foreground-muted"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateSkillRating(index, "rating", star)}
                        className={`text-lg leading-none ${star <= sr.rating ? "text-yellow-500" : "text-gray-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkillRow(index)}
                    className="text-foreground-muted hover:text-danger transition-colors p-1"
                    title="Remove skill"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="edit-pointers" className="block text-sm font-medium mb-1 text-foreground">
            Pointers for next interviewer <span className="text-foreground-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-pointers"
            name="pointersForNextInterviewer"
            rows={2}
            defaultValue={currentPointers ?? ""}
            className="w-full border border-border rounded px-3 py-2 bg-background text-foreground placeholder:text-foreground-muted"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Update Feedback"}
        </button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        title="Update feedback"
        message={
          <>
            You are about to update your interview feedback.
            {pendingPayload?.result === "NO_HIRE" && " Changing to NO HIRE will also mark the candidate as rejected."}
            {" "}Are you sure?
          </>
        }
        confirmLabel="Yes, update feedback"
        onConfirm={onConfirm}
        onCancel={() => { setShowConfirm(false); setPendingPayload(null); }}
        loading={isPending}
      />
    </>
  );
}
