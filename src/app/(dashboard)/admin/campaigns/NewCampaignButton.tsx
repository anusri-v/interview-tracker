"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaignButton({
  createCampaign,
}: {
  createCampaign: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = formRef.current;
    if (!form) return;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    if (!name) {
      setError("Campaign name is required.");
      return;
    }
    startTransition(async () => {
      await createCampaign(new FormData(form));
      setOpen(false);
      router.refresh();
    });
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Campaign
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-campaign-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-md w-full mx-4 text-foreground">
            <h2 id="new-campaign-title" className="text-xl font-bold mb-4 tracking-tight">
              New Campaign
            </h2>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-campaign-name" className="block text-sm font-medium mb-1.5 text-foreground">
                  Campaign name
                </label>
                <input
                  id="new-campaign-name"
                  name="name"
                  type="text"
                  placeholder="e.g. TCE-2026, Mepco-2026"
                  className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-foreground placeholder:text-foreground-muted"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium bg-card text-foreground hover:bg-surface disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Creating…" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
