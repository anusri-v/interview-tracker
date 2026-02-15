import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
  | "interview_ongoing";

export type StatusFilter = DisplayStatus | "all";

function getDisplayStatus(
  c: {
    status: string;
    interviews: { status: string }[];
  }
): DisplayStatus {
  if (c.status === "rejected") return "rejected";
  if (c.status === "selected") return "selected";
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
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) return;
  if (c.campaign.status === "completed") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { name, email, phone, college, department, resumeLink },
  });
  revalidatePath(`/admin/campaigns/${c.campaignId}/candidates`);
}

async function updateCandidateStatus(candidateId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const status = formData.get("status") as string;
  const role = (formData.get("role") as string)?.trim() || null;
  if (!status || !["selected", "rejected", "in_pipeline"].includes(status)) return;
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { campaign: { select: { id: true, status: true } } },
  });
  if (!c) return;
  if (c.campaign.status === "completed") return;
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: status as any, role },
  });
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

  try {
    await prisma.interview.create({
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
  revalidatePath(`/admin/campaigns/${candidate.campaignId}/candidates`);
}

async function createCandidate(campaignId: string, formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign || campaign.status === "completed") return;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  if (!name || !email) return;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const college = (formData.get("college") as string)?.trim() || null;
  const department = (formData.get("department") as string)?.trim() || null;
  const resumeLink = (formData.get("resumeLink") as string)?.trim() || null;
  try {
    await prisma.candidate.create({
      data: { campaignId, name, email, phone, college, department, resumeLink },
    });
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

export default async function CampaignCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") redirect("/login");

  const { id } = await params;
  const { search = "", status: statusParam } = await searchParams;
  const statusFilter: StatusFilter =
    typeof statusParam === "string" && VALID_STATUS_FILTERS.includes(statusParam as StatusFilter)
      ? (statusParam as StatusFilter)
      : "all";
  const searchTrimmed = typeof search === "string" ? search.trim() : "";

  const [campaign, interviewers] = await Promise.all([
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
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!campaign) notFound();

  const allCandidates = campaign.candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    college: c.college,
    department: c.department,
    resumeLink: c.resumeLink,
    status: c.status,
    interviews: c.interviews,
    displayStatus: getDisplayStatus(c),
  }));

  let candidates = allCandidates;
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

  return (
    <CandidatesPageClient
      campaignId={id}
      isActive={isActive}
      candidates={candidates}
      allCandidates={allCandidates}
      interviewers={interviewers}
      search={searchTrimmed}
      statusFilter={statusFilter}
      updateCandidateDetails={updateCandidateDetails}
      updateCandidateStatus={updateCandidateStatus}
      assignInterviewer={assignInterviewer}
      createCandidate={createCandidate}
    />
  );
}
