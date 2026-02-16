"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function HireCandidateModal({
  open,
  onClose,
  candidateId,
  candidateName,
  updateCandidateStatus,
}: {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  updateCandidateStatus: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      await updateCandidateStatus(candidateId, new FormData(formRef.current!));
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Hire Candidate">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Are you sure you want to mark <strong className="text-foreground">{candidateName}</strong> as hired?
        </p>
        <input type="hidden" name="status" value="selected" />
        <div>
          <label htmlFor="hire-role" className="block text-sm font-medium mb-1 text-foreground">Select Role</label>
          <select id="hire-role" name="role" required
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground appearance-none cursor-pointer">
            <option value="">Choose a role…</option>
            <option value="SDE">SDE</option>
            <option value="GEN AI">GEN AI</option>
            <option value="QA">QA</option>
            <option value="DevOps">DevOps</option>
            <option value="Data Scientist">Data Scientist</option>
            <option value="Data Engineer">Data Engineer</option>
            <option value="L1">L1</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
            {isPending ? "Saving…" : "Yes, mark as hired"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
