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

  const hasActiveInterview = await prisma.interview.findFirst({
    where: {
      candidateId,
      status: { in: ["scheduled", "ongoing"] },
    },
    select: { id: true },
  });
  if (hasActiveInterview) {
    redirect(`/admin/candidates/${candidateId}/assign?error=has_active_interview`);
  }

  await prisma.interview.createMany({
    data: interviewerIds.map((interviewerId) => ({
      candidateId,
      interviewerId,
      scheduledAt,
    })),
    skipDuplicates: true,
  });
  redirect(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

export default async function AssignInterviewersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: { error?: string };
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

  const errorParam = searchParams?.error;
  const errorMessage =
    errorParam === "has_active_interview"
      ? "This candidate already has an interview scheduled / ongoing."
      : undefined;

  return (
    <div className="max-w-md space-y-4">
      <Link
        href={`/admin/campaigns/${candidate.campaignId}/candidates`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to candidates
      </Link>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">Assign Interview</h1>
      <p className="text-sm text-foreground-secondary">
        Candidate: {candidate.name} ({candidate.email})
      </p>
      <AssignInterviewersForm
        candidateId={candidateId}
        interviewers={interviewers}
        existingInterviewerIds={existingInterviewerIds}
        assignInterviewers={assignInterviewers}
        error={errorMessage}
      />
    </div>
  );
}
