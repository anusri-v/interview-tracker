"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
    >
      Sign in with Google
    </button>
  );
}
