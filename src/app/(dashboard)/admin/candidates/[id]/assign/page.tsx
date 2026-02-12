import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AssignInterviewersForm from "./AssignInterviewersForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function assignInterviewers(
  candidateId: string,
  formData: FormData
) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const interviewerIds = formData.getAll("interviewerId") as string[];
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
  if (interviewerIds.length === 0) return;
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { status: true } } },
  });
  if (!candidate) redirect("/admin");
  if (candidate.campaign.status === "completed") redirect(`/admin/campaigns/${candidate.campaignId}`);
  await prisma.interview.createMany({
    data: interviewerIds.map((interviewerId) => ({
      candidateId,
      interviewerId,
      scheduledAt,
    })),
    skipDuplicates: true,
  });
  redirect(`/admin/campaigns/${candidate.campaignId}`);
}

export default async function AssignInterviewersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id: candidateId } = await params;
  const [candidate, interviewers] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ["interviewer", "admin"] } },
      select: { id: true, name: true, email: true },
    }),
  ]);
  if (!candidate) notFound();
  if (candidate.campaign.status === "completed") redirect(`/admin/campaigns/${candidate.campaignId}`);

  const existingInterviewerIds = await prisma.interview
    .findMany({
      where: { candidateId },
      select: { interviewerId: true },
    })
    .then((rows) => rows.map((r) => r.interviewerId));

  return (
    <div className="max-w-md space-y-4">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to {candidate.campaign.name}
      </Link>
      <h1 className="text-2xl font-bold">Assign interviewers</h1>
      <p className="text-sm text-gray-500">
        Candidate: {candidate.name} ({candidate.email})
      </p>
      <AssignInterviewersForm
        candidateId={candidateId}
        interviewers={interviewers}
        existingInterviewerIds={existingInterviewerIds}
        assignInterviewers={assignInterviewers}
      />
    </div>
  );
}
