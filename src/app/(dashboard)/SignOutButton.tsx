"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm px-3 py-1 border border-border rounded bg-card text-foreground hover:bg-background"
    >
      Sign out
    </button>
  );
}
