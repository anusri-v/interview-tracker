"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function OfferAcceptedModal({
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
    <Modal open={open} onClose={onClose} title="Offer Accepted">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Mark <strong className="text-foreground">{candidateName}</strong> as Offer Accepted?
        </p>
        <input type="hidden" name="status" value="offer_accepted" />
        <div>
          <label htmlFor="onboarding-date" className="block text-sm font-medium mb-1 text-foreground">
            Onboarding Date <span className="text-foreground-muted font-normal">(optional)</span>
          </label>
          <input
            id="onboarding-date"
            type="date"
            name="onboardingDate"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {isPending ? "Updating…" : "Yes, mark Offer Accepted"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
