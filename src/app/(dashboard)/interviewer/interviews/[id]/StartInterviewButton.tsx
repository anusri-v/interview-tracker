"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StartInterviewButton({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  function onConfirm() {
    setShowConfirm(false);
    startTransition(async () => {
      const res = await fetch(`/api/interviewer/interviews/${interviewId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="px-4 py-2 bg-success text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {isPending ? "Starting…" : "Start interview"}
      </button>
      <ConfirmDialog
        open={showConfirm}
        title="Start interview"
        message="Are you sure you want to start this interview? The interview will be marked as ongoing."
        confirmLabel="Yes, start interview"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        variant="success"
        loading={isPending}
      />
    </>
  );
}
