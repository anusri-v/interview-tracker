"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function PromoteAdminButton({
  userId,
  userDisplay,
}: {
  userId: string;
  userDisplay?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  function onConfirm() {
    setShowConfirm(false);
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
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="text-primary hover:underline text-sm disabled:opacity-50"
      >
        {isPending ? "Promoting…" : "Promote to admin"}
      </button>
      <ConfirmDialog
        open={showConfirm}
        title="Promote to admin"
        message={
          userDisplay
            ? `Are you sure you want to make ${userDisplay} an admin? They will have full access to manage campaigns, candidates, and other admins.`
            : "Are you sure you want to promote this user to admin? They will have full access to manage campaigns, candidates, and other admins."
        }
        confirmLabel="Yes, promote to admin"
        onConfirm={onConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isPending}
      />
    </>
  );
}
