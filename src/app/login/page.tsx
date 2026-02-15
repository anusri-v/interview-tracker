import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignIn from "./SignIn";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(session.user.role === "admin" ? "/admin" : "/interviewer");
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-6 text-foreground tracking-tight">Interview Tracker</h1>
      <SignIn />
    </main>
  );
}
