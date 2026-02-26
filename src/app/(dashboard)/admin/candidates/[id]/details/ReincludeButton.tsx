"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ReincludeButton({
  candidateId,
  candidateName,
  reincludeInPipeline,
}: {
  candidateId: string;
  candidateName: string;
  reincludeInPipeline: (candidateId: string) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        Re-include in Pipeline
      </button>
      <ConfirmDialog
        open={showConfirm}
        title="Re-include in Pipeline"
        message={<>Are you sure you want to re-include <strong>{candidateName}</strong> in the pipeline? Their existing feedback will be preserved.</>}
        confirmLabel={pending ? "Re-including..." : "Yes, re-include"}
        onConfirm={() => {
          startTransition(async () => {
            await reincludeInPipeline(candidateId);
            setShowConfirm(false);
          });
        }}
        onCancel={() => setShowConfirm(false)}
        loading={pending}
      />
    </>
  );
}
