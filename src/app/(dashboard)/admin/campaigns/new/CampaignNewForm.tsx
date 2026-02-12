"use client";

import { useTransition } from "react";

export default function CampaignNewForm({
  createCampaign,
}: {
  createCampaign: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => createCampaign(fd))}
      className="space-y-3"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Campaign name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. TCE-2026, Mepco-2026"
          className="w-full border rounded px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create campaign"}
      </button>
    </form>
  );
}
