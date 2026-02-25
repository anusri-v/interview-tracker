"use client";

import { useTransition, useState, useRef } from "react";
import type { Candidate } from "@prisma/client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ROLE_OPTIONS = [
  { value: "SDE", label: "SDE" },
  { value: "GEN AI", label: "GEN AI" },
  { value: "QA", label: "QA" },
  { value: "DevOps", label: "DevOps" },
  { value: "Data Scientist", label: "Data Scientist" },
  { value: "Data Engineer", label: "Data Engineer" },
  { value: "L1", label: "L1" },
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
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pendingRoleDisplay, setPendingRoleDisplay] = useState("");

  const isPipeline = candidate.status === "in_pipeline";
  const currentRoleIsPreset = ROLE_OPTIONS.some((o) => o.value === (candidate.hiredRole ?? ""));
  const defaultRoleChoice = candidate.hiredRole && currentRoleIsPreset ? candidate.hiredRole : (candidate.hiredRole ? "Other" : "");
  const defaultRoleOther = candidate.hiredRole && !currentRoleIsPreset ? candidate.hiredRole : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);
    const form = formRef.current;
    if (!form) return;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const roleChoice = (form.elements.namedItem("hiredRole") as HTMLSelectElement).value;
    const roleOther = (form.elements.namedItem("hiredRoleOther") as HTMLInputElement).value.trim();
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
    if (status === "rejected") {
      setShowConfirmReject(true);
      return;
    }
    startTransition(() => updateCandidate(candidate.id, new FormData(form)));
  }

  function confirmReject() {
    if (!formRef.current) return;
    setShowConfirmReject(false);
    startTransition(() => updateCandidate(candidate.id, new FormData(formRef.current!)));
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
        <p className="text-sm text-danger" role="alert">{fieldError}</p>
      )}
      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1 text-foreground">Status</label>
        <select
          id="status"
          name="status"
          defaultValue={candidate.status}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
        >
          <option value="in_pipeline">In pipeline</option>
          <option value="rejected">Rejected</option>
          {(isPipeline || candidate.status === "selected") && <option value="selected">Hired</option>}
        </select>
      </div>
      <div>
        <label htmlFor="hiredRole" className="block text-sm font-medium mb-1 text-foreground">Role (when hired)</label>
        <select
          id="hiredRole"
          name="hiredRole"
          defaultValue={defaultRoleChoice}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
        >
          <option value="">— Select role —</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div id="role-other-wrap">
        <label htmlFor="hiredRoleOther" className="block text-sm font-medium mb-1 text-foreground">Other role (if Other selected)</label>
        <input
          id="hiredRoleOther"
          name="hiredRoleOther"
          type="text"
          defaultValue={defaultRoleOther}
          placeholder="e.g. Product Manager"
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>

    {showConfirmHire && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
        <div className="bg-card border border-border rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 text-foreground">
          <h3 className="text-lg font-semibold mb-2">Confirm hire</h3>
          <p className="text-sm text-foreground-secondary mb-4">
            Are you sure you want to mark <strong>{candidate.name}</strong> as hired for <strong>{pendingRoleDisplay}</strong>?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmHire(false)}
              className="px-3 py-1.5 border border-border rounded bg-card text-foreground hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmHire}
              disabled={isPending}
              className="px-3 py-1.5 bg-success text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Yes, mark as hired
            </button>
          </div>
        </div>
      </div>
    )}
    <ConfirmDialog
      open={showConfirmReject}
      title="Reject candidate"
      message={
        <>
          Are you sure you want to mark <strong>{candidate.name}</strong> as rejected? This will update their status and they will no longer appear in the pipeline.
        </>
      }
      confirmLabel="Yes, reject"
      onConfirm={confirmReject}
      onCancel={() => setShowConfirmReject(false)}
      variant="danger"
      loading={isPending}
    />
    </>
  );
}
