"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  department: string | null;
  resumeLink: string | null;
  currentRole?: string | null;
};

export default function EditCandidateModal({
  open,
  onClose,
  candidate,
  campaignType,
  updateCandidateDetails,
}: {
  open: boolean;
  onClose: () => void;
  candidate: Candidate;
  campaignType?: string;
  updateCandidateDetails: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) return;
    startTransition(async () => {
      await updateCandidateDetails(candidate.id, new FormData(formRef.current!));
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Candidate">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-1 text-foreground">Name</label>
            <input id="edit-name" name="name" type="text" required defaultValue={candidate.name}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-resumeLink" className="block text-sm font-medium mb-1 text-foreground">Resume link</label>
            <input id="edit-resumeLink" name="resumeLink" type="url" defaultValue={candidate.resumeLink ?? ""} placeholder="https://..."
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-phone" className="block text-sm font-medium mb-1 text-foreground">Phone (+91)</label>
            <input id="edit-phone" name="phone" type="tel" defaultValue={candidate.phone ?? ""}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium mb-1 text-foreground">Email</label>
            <input id="edit-email" name="email" type="email" required defaultValue={candidate.email}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        {campaignType === "experienced" && (
        <div>
          <label htmlFor="edit-currentRole" className="block text-sm font-medium mb-1 text-foreground">Current Role</label>
          <input id="edit-currentRole" name="currentRole" type="text" defaultValue={candidate.currentRole ?? ""} placeholder="e.g. Software Engineer"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
        </div>
        )}
        {campaignType !== "experienced" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-college" className="block text-sm font-medium mb-1 text-foreground">College</label>
            <input id="edit-college" name="college" type="text" defaultValue={candidate.college ?? ""}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-department" className="block text-sm font-medium mb-1 text-foreground">Department</label>
            <input id="edit-department" name="department" type="text" defaultValue={candidate.department ?? ""}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
            {isPending ? "Saving…" : "Edit Candidate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
