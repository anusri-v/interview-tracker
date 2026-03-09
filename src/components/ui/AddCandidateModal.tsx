"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function AddCandidateModal({
  open,
  onClose,
  campaignId,
  campaignType,
  createCandidate,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignType: string;
  createCandidate: (campaignId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) return;
    startTransition(async () => {
      await createCandidate(campaignId, new FormData(formRef.current!));
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Candidate">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-name" className="block text-sm font-medium mb-1 text-foreground">Name</label>
            <input id="add-name" name="name" type="text" required
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="add-resumeLink" className="block text-sm font-medium mb-1 text-foreground">Resume link</label>
            <input id="add-resumeLink" name="resumeLink" type="url" placeholder="https://..."
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-phone" className="block text-sm font-medium mb-1 text-foreground">Phone (+91)</label>
            <input id="add-phone" name="phone" type="tel"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="add-email" className="block text-sm font-medium mb-1 text-foreground">Email</label>
            <input id="add-email" name="email" type="email" required
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        {campaignType !== "lateral" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-college" className="block text-sm font-medium mb-1 text-foreground">College</label>
            <input id="add-college" name="college" type="text"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          <div>
            <label htmlFor="add-department" className="block text-sm font-medium mb-1 text-foreground">Department</label>
            <input id="add-department" name="department" type="text"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
        </div>
        )}
        {campaignType === "lateral" && (
          <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-currentRole" className="block text-sm font-medium mb-1 text-foreground">Current Role</label>
              <input id="add-currentRole" name="currentRole" type="text" placeholder="e.g. Software Engineer"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
            <div>
              <label htmlFor="add-company" className="block text-sm font-medium mb-1 text-foreground">Company</label>
              <input id="add-company" name="company" type="text" placeholder="e.g. Acme Corp"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-yearsOfExperience" className="block text-sm font-medium mb-1 text-foreground">Years of Experience</label>
              <input id="add-yearsOfExperience" name="yearsOfExperience" type="number" step="0.5" min="0"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
            <div>
              <label htmlFor="add-location" className="block text-sm font-medium mb-1 text-foreground">Location</label>
              <input id="add-location" name="location" type="text" placeholder="e.g. Bangalore"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-source" className="block text-sm font-medium mb-1 text-foreground">Source</label>
              <select id="add-source" name="source" value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground appearance-none cursor-pointer">
                <option value="">Select source…</option>
                <option value="Employee Referral">Employee Referral</option>
                <option value="Online">Online</option>
                <option value="Vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label htmlFor="add-sourceDetail" className="block text-sm font-medium mb-1 text-foreground">
                {selectedSource === "Online" ? "Portal Name" : selectedSource === "Employee Referral" ? "Referred By" : selectedSource === "Vendor" ? "Vendor Name" : "Source Detail"}
              </label>
              <input id="add-sourceDetail" name="sourceDetail" type="text"
                readOnly={!selectedSource}
                placeholder={selectedSource === "Online" ? "e.g. Naukri, LinkedIn" : selectedSource === "Employee Referral" ? "e.g. John Doe" : selectedSource === "Vendor" ? "e.g. ABC Consultancy" : "Select a source first"}
                className={`w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted ${!selectedSource ? "opacity-50" : ""}`} />
            </div>
          </div>
          <div>
            <label htmlFor="add-dateFirstSpoken" className="block text-sm font-medium mb-1 text-foreground">Date First Spoken</label>
            <input id="add-dateFirstSpoken" name="dateFirstSpoken" type="date"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-currentCtc" className="block text-sm font-medium mb-1 text-foreground">Current CTC</label>
              <input id="add-currentCtc" name="currentCtc" type="text" placeholder="e.g. 12 LPA"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
            <div>
              <label htmlFor="add-expectedCtc" className="block text-sm font-medium mb-1 text-foreground">Expected CTC</label>
              <input id="add-expectedCtc" name="expectedCtc" type="text" placeholder="e.g. 18 LPA"
                className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
            </div>
          </div>
          <div>
            <label htmlFor="add-noticePeriod" className="block text-sm font-medium mb-1 text-foreground">Notice Period</label>
            <input id="add-noticePeriod" name="noticePeriod" type="text" placeholder="e.g. 30 days, 2 months"
              className="w-full border border-border rounded px-3 py-2 bg-card text-foreground placeholder:text-foreground-muted" />
          </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-surface disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
            {isPending ? "Adding…" : "Add Candidate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
