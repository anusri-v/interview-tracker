import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";

// Paths under /admin that interviewers are allowed to access
const INTERVIEWER_ALLOWED_PREFIXES = ["/admin/interviewers/"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "admin") {
    const headersList = await headers();
    const url = headersList.get("x-pathname") || "";
    const allowed = INTERVIEWER_ALLOWED_PREFIXES.some((p) => url.startsWith(p));
    if (!allowed) redirect("/interviewer");
  }
  return <>{children}</>;
}
