"use client";

import { useTransition, useState, useRef } from "react";
import type { Candidate } from "@prisma/client";

const ROLE_OPTIONS = [
  { value: "SDE", label: "SDE" },
  { value: "GEN AI", label: "GEN AI" },
  { value: "QA", label: "QA" },
  { value: "DevOps", label: "DevOps" },
  { value: "Other", label: "Other" },
] as const;

function getRoleDisplay(roleChoice: string, roleOther: string): string {
  if (roleChoice === "Other") return roleOther || "Other";
  return roleChoice;
}

export default function UpdateCandidateForm({
  candidate,
  updateCandidate,
}: {
  candidate: Candidate & { campaign: { id: string; name: string } };
  updateCandidate: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmHire, setShowConfirmHire] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pendingRoleDisplay, setPendingRoleDisplay] = useState("");

  const isPipeline = candidate.status === "in_pipeline";
  const currentRoleIsPreset = ROLE_OPTIONS.some((o) => o.value === (candidate.role ?? ""));
  const defaultRoleChoice = candidate.role && currentRoleIsPreset ? candidate.role : (candidate.role ? "Other" : "");
  const defaultRoleOther = candidate.role && !currentRoleIsPreset ? candidate.role : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);
    const form = formRef.current;
    if (!form) return;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const roleChoice = (form.elements.namedItem("role") as HTMLSelectElement).value;
    const roleOther = (form.elements.namedItem("roleOther") as HTMLInputElement).value.trim();
    if (status === "selected") {
      if (!roleChoice) {
        setFieldError("Please select a role when marking as hired.");
        return;
      }
      if (roleChoice === "Other" && !roleOther) {
        setFieldError("Please enter the role in the \"Other role\" field.");
        return;
      }
      const roleDisplay = getRoleDisplay(roleChoice, roleOther);
      setPendingRoleDisplay(roleDisplay);
      setShowConfirmHire(true);
      return;
    }
    startTransition(() => updateCandidate(candidate.id, new FormData(form)));
  }

  function confirmHire() {
    if (!formRef.current) return;
    setShowConfirmHire(false);
    startTransition(() => updateCandidate(candidate.id, new FormData(formRef.current!)));
  }

  return (
    <>
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      {fieldError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{fieldError}</p>
      )}
      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
        <select
          id="status"
          name="status"
          defaultValue={candidate.status}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value="in_pipeline">In pipeline</option>
          <option value="rejected">Rejected</option>
          {(isPipeline || candidate.status === "selected") && <option value="selected">Hired</option>}
        </select>
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium mb-1">Role (when hired)</label>
        <select
          id="role"
          name="role"
          defaultValue={defaultRoleChoice}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value="">— Select role —</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div id="role-other-wrap">
        <label htmlFor="roleOther" className="block text-sm font-medium mb-1">Other role (if Other selected)</label>
        <input
          id="roleOther"
          name="roleOther"
          type="text"
          defaultValue={defaultRoleOther}
          placeholder="e.g. Product Manager"
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>

    {showConfirmHire && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-lg font-semibold mb-2">Confirm hire</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Are you sure you want to mark <strong>{candidate.name}</strong> as hired for <strong>{pendingRoleDisplay}</strong>?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmHire(false)}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmHire}
              disabled={isPending}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Yes, mark as hired
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
