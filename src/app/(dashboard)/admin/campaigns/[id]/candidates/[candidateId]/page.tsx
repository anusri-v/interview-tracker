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

async function reassignInterviewer(interviewId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const newInterviewerId = formData.get("interviewerId") as string;
  if (!newInterviewerId) return;
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { candidate: { select: { id: true, campaignId: true, campaign: { select: { status: true } } } } },
  });
  if (!interview) return;
  if (interview.candidate.campaign.status === "completed") return;
  if (interview.status !== "scheduled" && interview.status !== "ongoing") return;

  const existing = await prisma.interview.findUnique({
    where: {
      candidateId_interviewerId: {
        candidateId: interview.candidateId,
        interviewerId: newInterviewerId,
      },
    },
  });
  if (existing) return;

  await prisma.interview.update({
    where: { id: interviewId },
    data: { interviewerId: newInterviewerId },
  });
  await auditLog({
    userId: session.user.id,
    action: "interview.reassign",
    entityType: "Interview",
    entityId: interviewId,
    metadata: { candidateId: interview.candidateId, fromInterviewerId: interview.interviewerId, toInterviewerId: newInterviewerId },
  });
  revalidatePath(`/admin/campaigns/${interview.candidate.campaignId}/candidates/${interview.candidateId}`);
}

async function reincludeInPipeline(candidateId: string) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { status: true, id: true } } },
  });
  if (!candidate || candidate.status !== "rejected") return;
  if (candidate.campaign.status === "completed") return;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "in_pipeline" },
  });
  await auditLog({
    userId: session.user.id,
    action: "candidate.reinclude",
    entityType: "Candidate",
    entityId: candidateId,
    metadata: { campaignId: candidate.campaignId },
  });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates/${candidateId}`);
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id: campaignId, candidateId } = await params;

  const [candidate, campaign, interviewersRaw, interviewerSlots] = await Promise.all([
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
                skillRatings: true,
              },
            },
          },
        },
      },
    }),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, status: true, type: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["interviewer", "admin"] } },
      select: {
        id: true,
        name: true,
        email: true,
        interviewsConducted: {
          where: {
            status: { in: ["scheduled", "ongoing"] },
            candidate: { campaignId },
          },
          select: { status: true },
        },
      },
    }),
    prisma.interviewerSlot.findMany({
      where: { campaignId, startTime: { gt: new Date() } },
      select: { id: true, interviewerId: true, startTime: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const interviewers = interviewersRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    hasOngoing: u.interviewsConducted.some((i) => i.status === "ongoing"),
    hasScheduled: u.interviewsConducted.some((i) => i.status === "scheduled"),
  }));

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
        skillRatings: Array.isArray(i.feedback?.skillRatings)
          ? (i.feedback!.skillRatings as Array<{ skill: string; rating: number }>)
          : [],
      }))}
      activeInterviews={activeInterviews.map((i) => ({
        id: i.id,
        interviewerId: i.interviewerId,
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
      reassignInterviewer={reassignInterviewer}
      reincludeInPipeline={campaign.status === "active" && candidate.status === "rejected" ? reincludeInPipeline : undefined}
      campaignType={campaign.type}
      interviewerSlots={interviewerSlots.map((s) => ({
        id: s.id,
        interviewerId: s.interviewerId,
        startTime: s.startTime.toISOString(),
      }))}
    />
  );
}
