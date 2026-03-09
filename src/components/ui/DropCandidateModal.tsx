"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function DropCandidateModal({
  open,
  onClose,
  candidateId,
  candidateName,
  updatePostSelectionStatus,
}: {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  updatePostSelectionStatus: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) return;
    startTransition(async () => {
      await updatePostSelectionStatus(candidateId, new FormData(formRef.current!));
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Drop Candidate">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Are you sure you want to drop <strong className="text-foreground">{candidateName}</strong>?
        </p>
        <input type="hidden" name="status" value="dropped" />
        <div>
          <label htmlFor="drop-reason" className="block text-sm font-medium mb-1 text-foreground">Reason for dropping</label>
          <textarea
            id="drop-reason"
            name="dropReason"
            required
            rows={3}
            placeholder="Explain why this candidate is being dropped…"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 disabled:opacity-50">
            {isPending ? "Dropping…" : "Yes, drop candidate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
