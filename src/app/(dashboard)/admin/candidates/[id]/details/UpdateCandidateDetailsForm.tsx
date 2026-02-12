"use client";

import { useTransition } from "react";
import type { Candidate } from "@prisma/client";

export default function UpdateCandidateDetailsForm({
  candidate,
  updateCandidateDetails,
}: {
  candidate: Candidate & { campaign: { id: string; name: string } };
  updateCandidateDetails: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(() => updateCandidateDetails(candidate.id, fd))
      }
      className="space-y-3"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={candidate.name}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={candidate.email}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={candidate.phone ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="college" className="block text-sm font-medium mb-1">
          College
        </label>
        <input
          id="college"
          name="college"
          type="text"
          defaultValue={candidate.college ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium mb-1">
          Department (optional)
        </label>
        <input
          id="department"
          name="department"
          type="text"
          defaultValue={candidate.department ?? ""}
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="resumeLink" className="block text-sm font-medium mb-1">
          Resume link
        </label>
        <input
          id="resumeLink"
          name="resumeLink"
          type="url"
          defaultValue={candidate.resumeLink ?? ""}
          placeholder="https://..."
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
