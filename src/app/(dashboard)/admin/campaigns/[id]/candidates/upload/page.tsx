import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CsvUploadForm from "./CsvUploadForm";

export default async function UploadCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();

  return (
    <div className="max-w-lg space-y-4">
      <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-blue-600 hover:underline">
        ← Back to {campaign.name}
      </Link>
      <h1 className="text-2xl font-bold">Upload candidates (CSV)</h1>
      <p className="text-sm text-gray-500">
        Required: <code className="bg-gray-100 dark:bg-zinc-800 px-1">name</code>,{" "}
        <code className="bg-gray-100 dark:bg-zinc-800 px-1">email</code>. Optional:{" "}
        <code className="bg-gray-100 dark:bg-zinc-800 px-1">phone</code>,{" "}
        <code className="bg-gray-100 dark:bg-zinc-800 px-1">college</code>,{" "}
        <code className="bg-gray-100 dark:bg-zinc-800 px-1">department</code>,{" "}
        <code className="bg-gray-100 dark:bg-zinc-800 px-1">resume_link</code>. One candidate per row.
      </p>
      <CsvUploadForm campaignId={campaignId} />
    </div>
  );
}
