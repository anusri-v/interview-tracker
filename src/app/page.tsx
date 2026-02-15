import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect(session.user.role === "admin" ? "/admin" : "/interviewer");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Interview Tracker</h1>
      <p className="text-foreground-secondary mb-6">
        Candidate recruitment management system
      </p>
      <Link
        href="/login"
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
      >
        Sign in with Google
      </Link>
    </main>
  );
}
