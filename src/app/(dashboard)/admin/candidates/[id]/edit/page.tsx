import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
  const role = (formData.get("role") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const college = (formData.get("college") as string)?.trim() || null;
  const department = (formData.get("department") as string)?.trim() || null;
  const resumeLink = (formData.get("resumeLink") as string)?.trim() || null;
  if (!status || !["rejected", "in_pipeline", "selected"].includes(status)) return;
  const c = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { campaignId: true } });
  if (!c) redirect("/admin");
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: status as "rejected" | "in_pipeline" | "selected",
      role,
      phone,
      college,
      department,
      resumeLink,
    },
  });
  redirect(`/admin/campaigns/${c.campaignId}`);
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
    include: { campaign: { select: { id: true, name: true } } },
  });
  if (!candidate) notFound();

  return (
    <div className="max-w-md space-y-4">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to {candidate.campaign.name}
      </Link>
      <h1 className="text-2xl font-bold">Update candidate</h1>
      <p className="text-sm text-gray-500">{candidate.name} — {candidate.email}</p>
      <UpdateCandidateForm candidate={candidate} updateCandidate={updateCandidate} />
    </div>
  );
}
