import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import CandidatesPageClient from "./CandidatesPageClient";

export const dynamic = "force-dynamic";

export type DisplayStatus =
  | "in_pipeline"
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing"
  | "no_show";

export type StatusFilter = DisplayStatus | "all";

function getDisplayStatus(
  c: {
    status: string;
    interviews: { status: string }[];
  }
): DisplayStatus {
  if (c.status === "rejected") return "rejected";
  if (c.status === "selected") return "selected";
  if (c.status === "no_show") return "no_show";
  const hasOngoing = c.interviews.some((i) => i.status === "ongoing");
  const hasScheduled = c.interviews.some((i) => i.status === "scheduled");
  if (hasOngoing) return "interview_ongoing";
  if (hasScheduled) return "interview_scheduled";
  return "in_pipeline";
}

const VALID_STATUS_FILTERS: StatusFilter[] = [
  "all",
  "in_pipeline",
  "interview_scheduled",
  "interview_ongoing",
  "rejected",
  "selected",
  "no_show",
];

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
  const currentRole = (formData.get("currentRole") as string)?.trim() || null;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) return;
  if (c.campaign.status === "completed") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { name, email, phone, college, department, resumeLink, currentRole },
  });
  await auditLog({ userId: session.user.id, action: "candidate.update", entityType: "Candidate", entityId: candidateId });
  revalidatePath(`/admin/campaigns/${c.campaignId}/candidates`);
}

async function updateCandidateStatus(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const status = formData.get("status") as string;
  const hiredRole = (formData.get("hiredRole") as string)?.trim() || null;
  if (!status || !["selected", "rejected", "in_pipeline"].includes(status)) return;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) return;
  if (c.campaign.status === "completed") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: status as any, hiredRole },
  });
  await auditLog({ userId: session.user.id, action: "candidate.status_change", entityType: "Candidate", entityId: candidateId, metadata: { status, hiredRole } });
  revalidatePath(`/admin/campaigns/${c.campaignId}/candidates`);
}

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

  // If the interviewer previously had a NO_SHOW interview with this candidate, delete it first
  const existingNoShow = await prisma.interview.findUnique({
    where: { candidateId_interviewerId: { candidateId, interviewerId } },
    include: { feedback: { select: { result: true } } },
  });
  if (existingNoShow?.feedback?.result === "NO_SHOW") {
    await prisma.interview.delete({ where: { id: existingNoShow.id } });
  }

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
      // Duplicate assignment, ignore
      return;
    }
    throw error;
  }
  await auditLog({ userId: session.user.id, action: "interview.assign", entityType: "Interview", entityId: interview.id, metadata: { candidateId, interviewerId } });

  // Consume matching availability slot if one exists
  await prisma.interviewerSlot.deleteMany({
    where: {
      interviewerId,
      campaignId: candidate.campaignId,
      startTime: scheduledAt,
    },
  });

  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

async function createCandidate(campaignId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true, type: true } });
  if (!campaign || campaign.status === "completed") return;
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
      // Duplicate, ignore silently in modal context
      return;
    }
    throw error;
  }
  revalidatePath(`/admin/campaigns/${campaignId}/candidates`);
}

async function cancelScheduledInterview(candidateId: string) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      campaign: { select: { id: true, status: true, type: true } },
      interviews: { where: { status: "scheduled" } },
    },
  });
  if (!candidate || candidate.campaign.status === "completed") return;
  if (candidate.campaign.type !== "experienced") return;
  const scheduledInterview = candidate.interviews[0];
  if (!scheduledInterview) return;
  await prisma.interview.delete({ where: { id: scheduledInterview.id } });
  await auditLog({ userId: session.user.id, action: "interview.cancel", entityType: "Interview", entityId: scheduledInterview.id, metadata: { candidateId } });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

async function rescheduleNoShow(candidateId: string) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!candidate || candidate.campaign.status === "completed") return;
  if (candidate.status !== "no_show") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "in_pipeline" },
  });
  await auditLog({ userId: session.user.id, action: "candidate.status_change", entityType: "Candidate", entityId: candidateId, metadata: { status: "in_pipeline", from: "no_show", reason: "reschedule" } });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

async function rejectNoShow(candidateId: string) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!candidate || candidate.campaign.status === "completed") return;
  if (candidate.status !== "no_show") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: "rejected" },
  });
  await auditLog({ userId: session.user.id, action: "candidate.status_change", entityType: "Candidate", entityId: candidateId, metadata: { status: "rejected", from: "no_show" } });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

export default async function CampaignCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; view?: string; page?: string; sort?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const { search = "", status: statusParam, page: pageParam, sort: sortParam } = await searchParams;
  const statusFilter: StatusFilter =
    typeof statusParam === "string" && VALID_STATUS_FILTERS.includes(statusParam as StatusFilter)
      ? (statusParam as StatusFilter)
      : "all";
  const searchTrimmed = typeof search === "string" ? search.trim() : "";

  const [campaign, interviewers, interviewerSlots] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: {
        candidates: {
          orderBy: { createdAt: "desc" },
          include: {
            interviews: {
              select: {
                id: true,
                status: true,
                interviewerId: true,
                createdAt: true,
                completedAt: true,
                interviewer: { select: { name: true, email: true } },
                feedback: { select: { result: true } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["interviewer", "admin"] } },
      select: {
        id: true,
        name: true,
        email: true,
        interviewsConducted: {
          where: { status: { in: ["scheduled", "ongoing"] } },
          select: { status: true },
        },
      },
    }).then((users) =>
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        hasOngoing: u.interviewsConducted.some((i) => i.status === "ongoing"),
        hasScheduled: u.interviewsConducted.some((i) => i.status === "scheduled"),
      }))
    ),
    prisma.interviewerSlot.findMany({
      where: { campaignId: id, startTime: { gt: new Date() } },
      select: { id: true, interviewerId: true, startTime: true },
      orderBy: { startTime: "asc" },
    }).then((slots) =>
      slots.map((s) => ({
        id: s.id,
        interviewerId: s.interviewerId,
        startTime: s.startTime.toISOString(),
      }))
    ),
  ]);

  if (!campaign) notFound();

  const now = Date.now();
  const sortByWaiting = sortParam === "waiting";

  const allCandidates = campaign.candidates.map((c) => {
    // Compute waiting time: time since last completed interview, or since creation if no interviews
    let waitingHours: number | null = null;
    const hasScheduledOrOngoing = c.interviews.some(
      (i) => i.status === "scheduled" || i.status === "ongoing"
    );
    if (c.status === "in_pipeline" && !hasScheduledOrOngoing) {
      const completedInterviews = c.interviews
        .filter((i) => i.status === "completed" && i.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
        );
      if (completedInterviews.length > 0) {
        waitingHours =
          (now - new Date(completedInterviews[0].completedAt!).getTime()) / 3600000;
      } else if (c.interviews.length === 0) {
        waitingHours = (now - new Date(c.createdAt).getTime()) / 3600000;
      }
    }

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      college: c.college,
      department: c.department,
      resumeLink: c.resumeLink,
      currentRole: c.currentRole,
      hiredRole: c.hiredRole,
      status: c.status,
      interviews: c.interviews,
      displayStatus: getDisplayStatus(c),
      waitingHours,
    };
  });

  let candidates = sortByWaiting
    ? [...allCandidates].sort((a, b) => (b.waitingHours ?? -1) - (a.waitingHours ?? -1))
    : allCandidates;
  if (searchTrimmed) {
    const lower = searchTrimmed.toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
    );
  }
  if (statusFilter !== "all") {
    candidates = candidates.filter((c) => c.displayStatus === statusFilter);
  }

  const isActive = campaign.status === "active";

  const PAGE_SIZE = 20;
  const totalFiltered = candidates.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam || "1", 10) || 1));
  const paginatedCandidates = candidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <CandidatesPageClient
      campaignId={id}
      campaignType={campaign.type}
      isActive={isActive}
      candidates={paginatedCandidates}
      allCandidates={allCandidates}
      currentPage={currentPage}
      totalPages={totalPages}
      totalFiltered={totalFiltered}
      interviewers={interviewers}
      interviewerSlots={interviewerSlots}
      search={searchTrimmed}
      statusFilter={statusFilter}
      sort={sortByWaiting ? "waiting" : "default"}
      updateCandidateDetails={updateCandidateDetails}
      updateCandidateStatus={updateCandidateStatus}
      assignInterviewer={assignInterviewer}
      createCandidate={createCandidate}
      cancelScheduledInterview={cancelScheduledInterview}
      rescheduleNoShow={rescheduleNoShow}
      rejectNoShow={rejectNoShow}
    />
  );
}
