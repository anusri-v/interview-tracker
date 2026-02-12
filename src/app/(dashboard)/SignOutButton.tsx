"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
    >
      Sign out
    </button>
  );
}
