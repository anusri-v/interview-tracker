import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CandidateNewForm from "./CandidateNewForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function createCandidate(campaignId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  if (!name || !email) return;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const college = (formData.get("college") as string)?.trim() || null;
  const department = (formData.get("department") as string)?.trim() || null;
  const resumeLink = (formData.get("resumeLink") as string)?.trim() || null;
  await prisma.candidate.create({
    data: { campaignId, name, email, phone, college, department, resumeLink },
  });
  redirect(`/admin/campaigns/${campaignId}`);
}

export default async function NewCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();

  return (
    <div className="max-w-md space-y-4">
      <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-blue-600 hover:underline">
        ← Back to {campaign.name}
      </Link>
      <h1 className="text-2xl font-bold">Add candidate</h1>
      <CandidateNewForm campaignId={campaignId} createCandidate={createCandidate} />
    </div>
  );
}
