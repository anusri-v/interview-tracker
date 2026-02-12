"use client";

import { useTransition } from "react";
import type { Candidate } from "@prisma/client";

export default function UpdateCandidateForm({
  candidate,
  updateCandidate,
}: {
  candidate: Candidate & { campaign: { id: string; name: string } };
  updateCandidate: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => updateCandidate(candidate.id, fd))}
      className="space-y-3"
    >
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={candidate.phone ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="college" className="block text-sm font-medium mb-1">College</label>
        <input
          id="college"
          name="college"
          type="text"
          defaultValue={candidate.college ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium mb-1">Department (optional)</label>
        <input
          id="department"
          name="department"
          type="text"
          defaultValue={candidate.department ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="resumeLink" className="block text-sm font-medium mb-1">Resume link</label>
        <input
          id="resumeLink"
          name="resumeLink"
          type="url"
          defaultValue={candidate.resumeLink ?? ""}
          placeholder="https://..."
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
        <select
          id="status"
          name="status"
          defaultValue={candidate.status}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value="in_pipeline">In pipeline</option>
          <option value="rejected">Rejected</option>
          <option value="selected">Selected</option>
        </select>
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium mb-1">Role (when selected)</label>
        <input
          id="role"
          name="role"
          type="text"
          defaultValue={candidate.role ?? ""}
          placeholder="e.g. Software Engineer"
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
