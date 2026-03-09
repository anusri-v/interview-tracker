"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function OfferInProcessModal({
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
    startTransition(async () => {
      await updatePostSelectionStatus(candidateId, new FormData(formRef.current!));
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Offer In Process">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Mark <strong className="text-foreground">{candidateName}</strong> as Offer In Process?
        </p>
        <input type="hidden" name="status" value="offer_in_process" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
            {isPending ? "Updating…" : "Yes, mark Offer In Process"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
