import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CandidatesPageClient from "@/app/(dashboard)/admin/campaigns/[id]/candidates/CandidatesPageClient";

export const dynamic = "force-dynamic";

type DisplayStatus =
  | "in_pipeline"
  | "rejected"
  | "selected"
  | "interview_scheduled"
  | "interview_ongoing"
  | "no_show";

function getDisplayStatus(c: {
  status: string;
  interviews: { status: string }[];
}): DisplayStatus {
  if (c.status === "rejected") return "rejected";
  if (c.status === "selected") return "selected";
  if (c.status === "no_show") return "no_show";
  const hasOngoing = c.interviews.some((i) => i.status === "ongoing");
  const hasScheduled = c.interviews.some((i) => i.status === "scheduled");
  if (hasOngoing) return "interview_ongoing";
  if (hasScheduled) return "interview_scheduled";
  return "in_pipeline";
}

type StatusFilter = DisplayStatus | "all";

const VALID_STATUS_FILTERS: StatusFilter[] = [
  "all",
  "in_pipeline",
  "interview_scheduled",
  "interview_ongoing",
  "rejected",
  "selected",
  "no_show",
];

// No-op server actions (read-only for interviewers)
async function noop() {
  "use server";
}

export default async function InterviewerCampaignCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { search = "", status: statusParam, page: pageParam } = await searchParams;
  const statusFilter: StatusFilter =
    typeof statusParam === "string" && VALID_STATUS_FILTERS.includes(statusParam as StatusFilter)
      ? (statusParam as StatusFilter)
      : "all";
  const searchTrimmed = typeof search === "string" ? search.trim() : "";

  const campaign = await prisma.campaign.findUnique({
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
              feedback: { select: { result: true } },
            },
          },
        },
      },
    },
  });
  if (!campaign) notFound();

  const allCandidates = campaign.candidates.map((c) => ({
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

  const PAGE_SIZE = 20;
  const totalFiltered = candidates.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam || "1", 10) || 1));
  const paginatedCandidates = candidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <CandidatesPageClient
        campaignId={id}
        campaignType={campaign.type}
        isActive={campaign.status === "active"}
        readOnly
        candidates={paginatedCandidates}
        allCandidates={allCandidates}
        currentPage={currentPage}
        totalPages={totalPages}
        totalFiltered={totalFiltered}
        interviewers={[]}
        search={searchTrimmed}
        statusFilter={statusFilter}
        updateCandidateDetails={noop}
        updateCandidateStatus={noop}
        assignInterviewer={noop}
        createCandidate={noop}
    />
  );
}
