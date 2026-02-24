import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import CandidateNewForm from "./CandidateNewForm";

async function createCandidate(campaignId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true, type: true } });
  if (!campaign || campaign.status === "completed") redirect(`/admin/campaigns/${campaignId}`);
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  if (!name || !email) return;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const college = (formData.get("college") as string)?.trim() || null;
  const department = (formData.get("department") as string)?.trim() || null;
  const resumeLink = (formData.get("resumeLink") as string)?.trim() || null;
  const currentRole = campaign.type === "fresher"
    ? "Fresher"
    : (formData.get("currentRole") as string)?.trim() || null;
  try {
    const candidate = await prisma.candidate.create({
      data: { campaignId, name, email, phone, college, department, resumeLink, currentRole },
    });
    await auditLog({ userId: session.user.id, action: "candidate.create", entityType: "Candidate", entityId: candidate.id, metadata: { campaignId, name, email } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target)
        ? target.join(",")
        : String(target ?? "");
      let errorCode: string | null = null;
      if (targetStr.includes("phone")) {
        errorCode = "phone_taken";
      } else if (targetStr.includes("email")) {
        errorCode = "email_taken";
      } else {
        errorCode = "unique";
      }
      redirect(
        `/admin/campaigns/${campaignId}/candidates/new?error=${errorCode}`,
      );
    }
    throw error;
  }
  redirect(`/admin/campaigns/${campaignId}`);
}

export default async function NewCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: { error?: string };
}) {
  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();
  if (campaign.status === "completed") redirect(`/admin/campaigns/${campaignId}`);

  const errorParam = searchParams?.error;
  const errorMessage =
    errorParam === "phone_taken"
      ? "This phone number is already associated with another candidate in this campaign."
      : errorParam === "email_taken"
      ? "This email is already associated with another candidate in this campaign."
      : errorParam === "unique"
      ? "Another candidate with these details already exists."
      : undefined;

  return (
    <div className="max-w-md space-y-4">
      <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-primary hover:underline">
        ← Back to {campaign.name}
      </Link>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Add Candidate</h1>
      <CandidateNewForm
        campaignId={campaignId}
        campaignType={campaign.type}
        createCandidate={createCandidate}
        error={errorMessage}
      />
    </div>
  );
}
