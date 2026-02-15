import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CsvUploadForm from "./CsvUploadForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UploadCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();
  if (campaign.status === "completed") redirect(`/admin/campaigns/${campaignId}`);

  return (
    <div className="max-w-lg space-y-4">
      <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-primary hover:underline">
        ← Back to {campaign.name}
      </Link>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Upload Candidates (CSV)</h1>
      <p className="text-sm text-foreground-secondary">
        Required: <code className="bg-card px-1.5 py-0.5 rounded text-foreground">name</code>,{" "}
        <code className="bg-card px-1.5 py-0.5 rounded text-foreground">email</code>. Optional:{" "}
        <code className="bg-card px-1.5 py-0.5 rounded text-foreground">phone</code>,{" "}
        <code className="bg-card px-1.5 py-0.5 rounded text-foreground">college</code>,{" "}
        <code className="bg-card px-1.5 py-0.5 rounded text-foreground">department</code>,{" "}
        <code className="bg-card px-1.5 py-0.5 rounded text-foreground">resume_link</code>. One candidate per row.
      </p>
      <CsvUploadForm campaignId={campaignId} />
    </div>
  );
}
