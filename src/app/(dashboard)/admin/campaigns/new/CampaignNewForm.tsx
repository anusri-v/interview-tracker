"use client";

import { useRef, useState, useTransition } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CampaignNewForm({
  createCampaign,
}: {
  createCampaign: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formRef.current?.checkValidity()) setShowConfirm(true);
  }

  function onConfirm() {
    if (!formRef.current) return;
    setShowConfirm(false);
    startTransition(() => createCampaign(new FormData(formRef.current!)));
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1 text-foreground">
            Campaign name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g. TCE-2026, Mepco-2026"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create campaign"}
        </button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        title="Create campaign"
        message="Are you sure you want to create this campaign? You can add candidates after creation."
        confirmLabel="Yes, create campaign"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isPending}
      />
    </>
  );
}
