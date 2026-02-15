import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PromoteAdminButton from "./PromoteAdminButton";

export default async function ManageAdminsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Manage Admins</h1>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">User</th>
              <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Email</th>
              <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Role</th>
              <th className="border-b border-border px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">{u.name ?? "—"}</td>
                <td className="px-5 py-4 text-foreground-secondary">{u.email}</td>
                <td className="px-5 py-4">
                  <span className="capitalize text-foreground-secondary">{u.role}</span>
                </td>
                <td className="px-5 py-4">
                  {u.role === "interviewer" && (
                    <PromoteAdminButton
                      userId={u.id}
                      userDisplay={u.name || u.email}
                    />
                  )}
                  {u.role === "admin" && (
                    <span className="text-foreground-muted text-sm">Admin</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
