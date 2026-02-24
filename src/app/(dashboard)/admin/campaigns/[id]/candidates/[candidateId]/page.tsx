import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import CandidateDetailClient from "./CandidateDetailClient";

export const dynamic = "force-dynamic";

async function assignInterviewer(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const interviewerId = formData.get("interviewerId") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
  if (!interviewerId) return;
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { status: true, id: true } } },
  });
  if (!candidate) return;
  if (candidate.campaign.status === "completed") return;

  let interview;
  try {
    interview = await prisma.interview.create({
      data: { candidateId, interviewerId, scheduledAt },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
  await auditLog({ userId: session.user.id, action: "interview.assign", entityType: "Interview", entityId: interview.id, metadata: { candidateId, interviewerId } });
  revalidatePath(
    `/admin/campaigns/${candidate.campaignId}/candidates/${candidateId}`
  );
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id: campaignId, candidateId } = await params;

  const [candidate, campaign, interviewers] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        interviews: {
          orderBy: { createdAt: "asc" },
          include: {
            interviewer: { select: { id: true, name: true, email: true } },
            feedback: {
              select: {
                result: true,
                feedback: true,
                pointersForNextInterviewer: true,
              },
            },
          },
        },
      },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, status: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["interviewer", "admin"] } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!candidate || !campaign || candidate.campaignId !== campaignId) {
    notFound();
  }

  const completedInterviews = candidate.interviews.filter(
    (i) => i.status === "completed"
  );
  const activeInterviews = candidate.interviews.filter(
    (i) => i.status === "scheduled" || i.status === "ongoing"
  );
  const existingInterviewerIds = candidate.interviews.map(
    (i) => i.interviewerId
  );
  const completedInterviewerIds = completedInterviews.map(
    (i) => i.interviewerId
  );

  const hasActiveInterviews = activeInterviews.length > 0;
  const canAssign =
    campaign.status === "active" &&
    candidate.status === "in_pipeline" &&
    !hasActiveInterviews;

  return (
    <CandidateDetailClient
      campaignId={campaignId}
      campaignName={campaign.name}
      candidate={{
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        college: candidate.college,
        department: candidate.department,
        resumeLink: candidate.resumeLink,
        status: candidate.status,
      }}
      completedInterviews={completedInterviews.map((i, idx) => ({
        id: i.id,
        round: idx + 1,
        interviewerName: i.interviewer.name || i.interviewer.email,
        status: i.status,
        result: i.feedback?.result ?? null,
        feedbackText: i.feedback?.feedback ?? null,
        pointers: i.feedback?.pointersForNextInterviewer ?? null,
      }))}
      activeInterviews={activeInterviews.map((i) => ({
        id: i.id,
        interviewerName: i.interviewer.name || i.interviewer.email,
        status: i.status,
        scheduledAt: i.scheduledAt?.toISOString() ?? null,
      }))}
      canAssign={canAssign}
      interviewers={interviewers}
      existingInterviewerIds={existingInterviewerIds}
      completedInterviewerIds={completedInterviewerIds}
      nextRound={completedInterviews.length + 1}
      assignInterviewer={assignInterviewer}
    />
  );
}
