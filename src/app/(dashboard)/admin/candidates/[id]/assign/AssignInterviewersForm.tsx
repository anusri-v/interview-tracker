"use client";

import { useTransition } from "react";

type Interviewer = { id: string; name: string | null; email: string };

export default function AssignInterviewersForm({
  candidateId,
  interviewers,
  existingInterviewerIds,
  assignInterviewers,
}: {
  candidateId: string;
  interviewers: Interviewer[];
  existingInterviewerIds: string[];
  assignInterviewers: (candidateId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => assignInterviewers(candidateId, fd))}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-2">Interviewers</label>
        <div className="border rounded divide-y max-h-48 overflow-y-auto dark:border-zinc-700">
          {interviewers.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">No interviewers in the system yet.</p>
          ) : (
            interviewers.map((u) => {
              const alreadyAssigned = existingInterviewerIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 p-3 cursor-pointer ${alreadyAssigned ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="interviewerId"
                    value={u.id}
                    disabled={alreadyAssigned}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {u.name || u.email} {alreadyAssigned && "(already assigned)"}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium mb-1">
          Scheduled at (optional)
        </label>
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || interviewers.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Assigning…" : "Assign"}
      </button>
    </form>
  );
}
