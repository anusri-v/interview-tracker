"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PromoteAdminButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await fetch("/api/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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
      className="text-blue-600 hover:underline text-sm disabled:opacity-50"
    >
      {isPending ? "Promoting…" : "Promote to admin"}
    </button>
  );
}
