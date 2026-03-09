"use client";

import { useRef, useState, useTransition } from "react";
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
  company?: string | null;
  yearsOfExperience?: number | null;
  location?: string | null;
  source?: string | null;
  sourceDetail?: string | null;
  currentCtc?: string | null;
  expectedCtc?: string | null;
  noticePeriod?: string | null;
  dateFirstSpoken?: string | null;
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
  const [selectedSource, setSelectedSource] = useState(candidate.source ?? "");

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
        {campaignType === "lateral" && (
        <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-currentRole" className="block text-sm font-medium mb-1 text-foreground">Current Role</label>
            <input id="edit-currentRole" name="currentRole" type="text" defaultValue={candidate.currentRole ?? ""} placeholder="e.g. Software Engineer"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-company" className="block text-sm font-medium mb-1 text-foreground">Company</label>
            <input id="edit-company" name="company" type="text" defaultValue={candidate.company ?? ""} placeholder="e.g. Acme Corp"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-yearsOfExperience" className="block text-sm font-medium mb-1 text-foreground">Years of Experience</label>
            <input id="edit-yearsOfExperience" name="yearsOfExperience" type="number" step="0.5" min="0" defaultValue={candidate.yearsOfExperience ?? ""}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-location" className="block text-sm font-medium mb-1 text-foreground">Location</label>
            <input id="edit-location" name="location" type="text" defaultValue={candidate.location ?? ""} placeholder="e.g. Bangalore"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-source" className="block text-sm font-medium mb-1 text-foreground">Source</label>
            <select id="edit-source" name="source" value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground appearance-none cursor-pointer">
              <option value="">Select source…</option>
              <option value="Employee Referral">Employee Referral</option>
              <option value="Online">Online</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>
          <div>
            <label htmlFor="edit-sourceDetail" className="block text-sm font-medium mb-1 text-foreground">
              {selectedSource === "Online" ? "Portal Name" : selectedSource === "Employee Referral" ? "Referred By" : selectedSource === "Vendor" ? "Vendor Name" : "Source Detail"}
            </label>
            <input id="edit-sourceDetail" name="sourceDetail" type="text" defaultValue={candidate.sourceDetail ?? ""}
              readOnly={!selectedSource}
              placeholder={selectedSource === "Online" ? "e.g. Naukri, LinkedIn" : selectedSource === "Employee Referral" ? "e.g. John Doe" : selectedSource === "Vendor" ? "e.g. ABC Consultancy" : "Select a source first"}
              className={`w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted ${!selectedSource ? "opacity-50" : ""}`} />
          </div>
        </div>
        <div>
          <label htmlFor="edit-dateFirstSpoken" className="block text-sm font-medium mb-1 text-foreground">Date First Spoken</label>
          <input id="edit-dateFirstSpoken" name="dateFirstSpoken" type="date" defaultValue={candidate.dateFirstSpoken ?? ""}
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-currentCtc" className="block text-sm font-medium mb-1 text-foreground">Current CTC</label>
            <input id="edit-currentCtc" name="currentCtc" type="text" defaultValue={candidate.currentCtc ?? ""} placeholder="e.g. 12 LPA"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="edit-expectedCtc" className="block text-sm font-medium mb-1 text-foreground">Expected CTC</label>
            <input id="edit-expectedCtc" name="expectedCtc" type="text" defaultValue={candidate.expectedCtc ?? ""} placeholder="e.g. 18 LPA"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        <div>
          <label htmlFor="edit-noticePeriod" className="block text-sm font-medium mb-1 text-foreground">Notice Period</label>
          <input id="edit-noticePeriod" name="noticePeriod" type="text" defaultValue={candidate.noticePeriod ?? ""} placeholder="e.g. 30 days, 2 months"
            className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
        </div>
        </>
        )}
        {campaignType !== "lateral" && (
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
