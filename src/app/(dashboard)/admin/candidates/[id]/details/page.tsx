import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UpdateCandidateDetailsForm from "./UpdateCandidateDetailsForm";

async function updateCandidateDetails(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  if (!name || !email) return;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const college = (formData.get("college") as string)?.trim() || null;
  const department = (formData.get("department") as string)?.trim() || null;
  const resumeLink = (formData.get("resumeLink") as string)?.trim() || null;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) redirect("/admin");
  if (c.campaign.status === "completed") redirect(`/admin/campaigns/${c.campaignId}`);
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { name, email, phone, college, department, resumeLink },
  });
  redirect(`/admin/campaigns/${c.campaignId}/candidates`);
}

export default async function CandidateDetailsPage({
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
  if (candidate.campaign.status === "completed")
    redirect(`/admin/campaigns/${candidate.campaignId}`);

  return (
    <div className="max-w-md space-y-4">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}/candidates`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to candidates
      </Link>
      <h1 className="text-2xl font-bold">Candidate details</h1>
      <UpdateCandidateDetailsForm
        candidate={candidate}
        updateCandidateDetails={updateCandidateDetails}
      />
    </div>
  );
}
