"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function StartInterviewButton({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
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
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? "Starting…" : "Start interview"}
    </button>
  );
}
