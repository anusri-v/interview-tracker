"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CandidateNewForm({
  campaignId,
  campaignType,
  createCandidate,
  error,
}: {
  campaignId: string;
  campaignType: string;
  createCandidate: (campaignId: string, formData: FormData) => Promise<void>;
  error?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState<boolean>(!!error);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!error) return;
    setShowToast(true);
    const id = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(id);
  }, [error]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formRef.current?.checkValidity()) setShowConfirm(true);
  }

  function onConfirm() {
    if (!formRef.current) return;
    setShowConfirm(false);
    startTransition(() => createCandidate(campaignId, new FormData(formRef.current!)));
  }

  return (
    <>
      {showToast && error && (
        <div className="fixed right-4 top-16 z-50 max-w-sm rounded border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger shadow-lg">
          {error}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1 text-foreground">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1 text-foreground">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1 text-foreground">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="college" className="block text-sm font-medium mb-1 text-foreground">College</label>
        <input
          id="college"
          name="college"
          type="text"
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium mb-1 text-foreground">Department (optional)</label>
        <input
          id="department"
          name="department"
          type="text"
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="resumeLink" className="block text-sm font-medium mb-1 text-foreground">Resume link</label>
        <input
          id="resumeLink"
          name="resumeLink"
          type="url"
          placeholder="https://..."
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      {campaignType === "experienced" && (
        <div>
          <label htmlFor="currentRole" className="block text-sm font-medium mb-1 text-foreground">Current Role</label>
          <input
            id="currentRole"
            name="currentRole"
            type="text"
            placeholder="e.g. Software Engineer, Product Manager"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
          />
        </div>
      )}
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add candidate"}
        </button>
      </form>
      <ConfirmDialog
        open={showConfirm}
        title="Add candidate"
        message="Are you sure you want to add this candidate to the campaign?"
        confirmLabel="Yes, add candidate"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isPending}
      />
    </>
  );
}
