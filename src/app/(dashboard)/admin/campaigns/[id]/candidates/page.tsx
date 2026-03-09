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
  | "no_show"
  | "dropped"
  | "offer_in_process"
  | "offer_accepted";

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
  if (c.status === "dropped") return "dropped";
  if (c.status === "offer_in_process") return "offer_in_process";
  if (c.status === "offer_accepted") return "offer_accepted";
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
  "dropped",
  "offer_in_process",
  "offer_accepted",
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
  const dateFirstSpokenRaw = (formData.get("dateFirstSpoken") as string)?.trim() || null;
  const dateFirstSpoken = dateFirstSpokenRaw ? new Date(dateFirstSpokenRaw) : null;
  const source = (formData.get("source") as string)?.trim() || null;
  const sourceDetail = (formData.get("sourceDetail") as string)?.trim() || null;
  const yearsOfExperienceRaw = (formData.get("yearsOfExperience") as string)?.trim();
  const yearsOfExperience = yearsOfExperienceRaw ? parseFloat(yearsOfExperienceRaw) : null;
  const company = (formData.get("company") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const currentCtc = (formData.get("currentCtc") as string)?.trim() || null;
  const expectedCtc = (formData.get("expectedCtc") as string)?.trim() || null;
  const noticePeriod = (formData.get("noticePeriod") as string)?.trim() || null;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) return;
  if (c.campaign.status === "completed") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { name, email, phone, college, department, resumeLink, currentRole, dateFirstSpoken, source, sourceDetail, yearsOfExperience, company, location, currentCtc, expectedCtc, noticePeriod },
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

  // Prevent duplicate active interviews for the same candidate+interviewer
  const existingActive = await prisma.interview.findFirst({
    where: { candidateId, interviewerId, status: { in: ["scheduled", "ongoing"] } },
  });
  if (existingActive) return;

  const interview = await prisma.interview.create({
    data: { candidateId, interviewerId, scheduledAt },
  });
  await auditLog({ userId: session.user.id, action: "interview.assign", entityType: "Interview", entityId: interview.id, metadata: { candidateId, interviewerId } });

  // Link matching availability slot to the interview instead of deleting
  const matchingSlot = await prisma.interviewerSlot.findFirst({
    where: {
      interviewerId,
      campaignId: candidate.campaignId,
      startTime: scheduledAt,
      interviewId: null,
    },
  });
  if (matchingSlot) {
    await prisma.interviewerSlot.update({
      where: { id: matchingSlot.id },
      data: { interviewId: interview.id },
    });
  }

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
  const dateFirstSpokenRaw = (formData.get("dateFirstSpoken") as string)?.trim() || null;
  const dateFirstSpoken = dateFirstSpokenRaw ? new Date(dateFirstSpokenRaw) : null;
  const source = (formData.get("source") as string)?.trim() || null;
  const sourceDetail = (formData.get("sourceDetail") as string)?.trim() || null;
  const yearsOfExperienceRaw = (formData.get("yearsOfExperience") as string)?.trim();
  const yearsOfExperience = yearsOfExperienceRaw ? parseFloat(yearsOfExperienceRaw) : null;
  const company = (formData.get("company") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const currentCtc = (formData.get("currentCtc") as string)?.trim() || null;
  const expectedCtc = (formData.get("expectedCtc") as string)?.trim() || null;
  const noticePeriodCreate = (formData.get("noticePeriod") as string)?.trim() || null;
  try {
    const candidate = await prisma.candidate.create({
      data: { campaignId, name, email, phone, college, department, resumeLink, currentRole, dateFirstSpoken, source, sourceDetail, yearsOfExperience, company, location, currentCtc, expectedCtc, noticePeriod: noticePeriodCreate },
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

async function assignPanel(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const interviewerIds = formData.getAll("interviewerIds") as string[];
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
  if (interviewerIds.length < 2) return;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { status: true, id: true } } },
  });
  if (!candidate) return;
  if (candidate.campaign.status === "completed") return;

  const panelGroupId = crypto.randomUUID();

  for (const interviewerId of interviewerIds) {
    const existingActive = await prisma.interview.findFirst({
      where: { candidateId, interviewerId, status: { in: ["scheduled", "ongoing"] } },
    });
    if (existingActive) continue;
    await prisma.interview.create({
      data: { candidateId, interviewerId, scheduledAt, panelGroupId },
    });
  }

  await auditLog({
    userId: session.user.id,
    action: "interview.assign_panel",
    entityType: "Interview",
    entityId: panelGroupId,
    metadata: { candidateId, interviewerIds, panelGroupId },
  });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
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

  // Check if new interviewer already has an active interview with this candidate
  const existing = await prisma.interview.findFirst({
    where: {
      candidateId: interview.candidateId,
      interviewerId: newInterviewerId,
      status: { in: ["scheduled", "ongoing"] },
    },
  });
  if (existing) return;

  // Unlink old interviewer's slot
  await prisma.interviewerSlot.updateMany({
    where: { interviewId },
    data: { interviewId: null },
  });
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
  revalidatePath(`/admin/campaigns/${interview.candidate.campaignId}/candidates`);
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
  if (candidate.campaign.type !== "lateral") return;
  const scheduledInterview = candidate.interviews[0];
  if (!scheduledInterview) return;
  // Unlink any associated slot so it becomes available again
  await prisma.interviewerSlot.updateMany({
    where: { interviewId: scheduledInterview.id },
    data: { interviewId: null },
  });
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

async function updatePostSelectionStatus(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const newStatus = formData.get("status") as string;
  const dropReason = (formData.get("dropReason") as string)?.trim() || null;
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true, type: true } } },
  });
  if (!candidate || candidate.campaign.status === "completed") return;
  if (candidate.campaign.type !== "lateral") return;

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    selected: ["offer_in_process", "dropped"],
    offer_in_process: ["offer_accepted", "dropped"],
  };
  const allowed = validTransitions[candidate.status];
  if (!allowed || !allowed.includes(newStatus)) return;

  const data: any = { status: newStatus };
  if (newStatus === "dropped" && dropReason) {
    data.dropReason = dropReason;
  }
  if (newStatus === "offer_accepted") {
    const onboardingDateRaw = (formData.get("onboardingDate") as string)?.trim() || null;
    if (onboardingDateRaw) {
      data.onboardingDate = new Date(onboardingDateRaw);
    }
  }

  await prisma.candidate.update({ where: { id: candidateId }, data });
  await auditLog({ userId: session.user.id, action: "candidate.status_change", entityType: "Candidate", entityId: candidateId, metadata: { status: newStatus, dropReason } });
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

export default async function CampaignCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; view?: string; page?: string; sort?: string; round?: string; role?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const { search = "", status: statusParam, page: pageParam, sort: sortParam, round: roundParam, role: roleParam } = await searchParams;
  // Support comma-separated multi-status filter
  const statusFilters: StatusFilter[] = typeof statusParam === "string"
    ? statusParam.split(",").filter((s): s is StatusFilter => VALID_STATUS_FILTERS.includes(s as StatusFilter))
    : [];
  const statusFilter = statusFilters.length === 0 ? "all" : statusFilters.join(",");
  const searchTrimmed = typeof search === "string" ? search.trim() : "";

  const [campaign, interviewers, interviewerSlots, interviewerSettings] = await Promise.all([
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
          where: {
            status: { in: ["scheduled", "ongoing"] },
            candidate: { campaignId: id },
          },
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
      where: { campaignId: id, startTime: { gt: new Date() }, interviewId: null },
      select: { id: true, interviewerId: true, startTime: true },
      orderBy: { startTime: "asc" },
    }).then((slots) =>
      slots.map((s) => ({
        id: s.id,
        interviewerId: s.interviewerId,
        startTime: s.startTime.toISOString(),
      }))
    ),
    prisma.interviewerCampaignSetting.findMany({
      where: { campaignId: id },
      select: { interviewerId: true, mode: true, roomNumber: true, meetLink: true },
    }),
  ]);

  if (!campaign) notFound();

  // Extract distinct roles for role filter
  const distinctRoles = [...new Set(
    campaign.candidates
      .map((c) => c.currentRole)
      .filter((r): r is string => !!r)
  )].sort();

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
      dateFirstSpoken: c.dateFirstSpoken?.toISOString() ?? null,
      source: c.source,
      sourceDetail: c.sourceDetail,
      yearsOfExperience: c.yearsOfExperience,
      company: c.company,
      location: c.location,
      currentCtc: c.currentCtc,
      expectedCtc: c.expectedCtc,
      noticePeriod: c.noticePeriod,
      dropReason: c.dropReason,
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
        c.email.toLowerCase().includes(lower) ||
        c.college?.toLowerCase().includes(lower)
    );
  }
  if (statusFilters.length > 0) {
    candidates = candidates.filter((c) => statusFilters.includes(c.displayStatus as StatusFilter));
  }
  const roundFilter = roundParam && ["1", "2", "3", "4", "5"].includes(roundParam) ? roundParam : "all";
  if (roundFilter !== "all") {
    const roundNum = parseInt(roundFilter, 10);
    candidates = candidates.filter((c) => {
      const passedRounds = c.interviews.filter(
        (i) => i.status === "completed" && i.feedback && (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
      ).length;
      return passedRounds + 1 === roundNum;
    });
  }
  const roleFilter = roleParam?.trim() || "all";
  if (roleFilter !== "all") {
    candidates = candidates.filter((c) => c.currentRole === roleFilter);
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
      roundFilter={roundFilter}
      roleFilter={roleFilter}
      distinctRoles={distinctRoles}
      updateCandidateDetails={updateCandidateDetails}
      updateCandidateStatus={updateCandidateStatus}
      assignInterviewer={assignInterviewer}
      createCandidate={createCandidate}
      reassignInterviewer={reassignInterviewer}
      cancelScheduledInterview={cancelScheduledInterview}
      rescheduleNoShow={rescheduleNoShow}
      rejectNoShow={rejectNoShow}
      interviewerSettings={interviewerSettings}
      assignPanel={campaign.type === "fresher" ? assignPanel : undefined}
      updatePostSelectionStatus={updatePostSelectionStatus}
    />
  );
}
