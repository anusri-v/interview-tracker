"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

type PipelineCandidate = { id: string; name: string; email: string };

export default function MarkCampaignCompletedButton({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [pipelineCandidates, setPipelineCandidates] = useState<PipelineCandidate[]>([]);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/complete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        return;
      }
      if (res.status === 400 && Array.isArray(data.pipelineCandidates)) {
        setPipelineCandidates(data.pipelineCandidates);
        setShowModal(true);
        return;
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Mark as completed"}
      </button>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-modal-title"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <h2 id="complete-modal-title" className="text-lg font-semibold mb-2">
              Cannot complete campaign
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              All candidates must be either rejected or hired before marking <strong>{campaignName}</strong> as
              completed. The following candidates are still in pipeline:
            </p>
            <ul className="list-disc list-inside text-sm overflow-y-auto flex-1 min-h-0 mb-4">
              {pipelineCandidates.map((c) => (
                <li key={c.id}>
                  {c.name} ({c.email})
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
