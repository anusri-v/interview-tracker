import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import Link from "next/link";
import UpdateCandidateForm from "./UpdateCandidateForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function updateCandidate(
  candidateId: string,
  formData: FormData
) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const status = formData.get("status") as string;
  const roleChoice = (formData.get("hiredRole") as string)?.trim() || null;
  const roleOther = (formData.get("hiredRoleOther") as string)?.trim() || null;
  const hiredRole = roleChoice === "Other" ? roleOther : roleChoice;
  if (!status || !["rejected", "in_pipeline", "selected"].includes(status)) return;
  if (status === "selected" && !hiredRole) return;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) redirect("/admin");
  if (c.campaign.status === "completed") redirect(`/admin/campaigns/${c.campaignId}`);
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: status as "rejected" | "in_pipeline" | "selected",
      hiredRole,
    },
  });
  await auditLog({ userId: session.user.id, action: "candidate.status_change", entityType: "Candidate", entityId: candidateId, metadata: { status, hiredRole } });
  redirect(`/admin/campaigns/${c.campaignId}/candidates`);
}

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  });
  if (!candidate) notFound();
  if (candidate.campaign.status === "completed") redirect(`/admin/campaigns/${candidate.campaignId}`);

  return (
    <div className="max-w-md space-y-4">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}/candidates`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to candidates
      </Link>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Edit Status</h1>
      <p className="text-sm text-foreground-secondary">{candidate.name} — {candidate.email}</p>
      <UpdateCandidateForm candidate={candidate} updateCandidate={updateCandidate} />
    </div>
  );
}
