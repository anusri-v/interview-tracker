"use client";

import { useRef, useState, useTransition } from "react";
import type { Candidate } from "@prisma/client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function UpdateCandidateDetailsForm({
  candidate,
  updateCandidateDetails,
}: {
  candidate: Candidate & { campaign: { id: string; name: string } };
  updateCandidateDetails: (candidateId: string, formData: FormData) => Promise<void>;
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
    startTransition(() => updateCandidateDetails(candidate.id, new FormData(formRef.current!)));
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1 text-foreground">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={candidate.name}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1 text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={candidate.email}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1 text-foreground">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={candidate.phone ?? ""}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="college" className="block text-sm font-medium mb-1 text-foreground">
          College
        </label>
        <input
          id="college"
          name="college"
          type="text"
          defaultValue={candidate.college ?? ""}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium mb-1 text-foreground">
          Department (optional)
        </label>
        <input
          id="department"
          name="department"
          type="text"
          defaultValue={candidate.department ?? ""}
          className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted"
        />
      </div>
      <div>
        <label htmlFor="resumeLink" className="block text-sm font-medium mb-1 text-foreground">
          Resume link
        </label>
        <input
          id="resumeLink"
          name="resumeLink"
          type="url"
          defaultValue={candidate.resumeLink ?? ""}
          placeholder="https://..."
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
      <ConfirmDialog
        open={showConfirm}
        title="Save candidate details"
        message="Are you sure you want to save these changes to the candidate?"
        confirmLabel="Yes, save"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isPending}
      />
    </>
  );
}
