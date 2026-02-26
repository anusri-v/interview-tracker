import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import InterviewerCandidateDetailClient from "./InterviewerCandidateDetailClient";
import AutoRefresh from "@/components/ui/AutoRefresh";

export default async function InterviewerCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true, type: true } },
      interviews: {
        where: { status: "completed" },
        include: {
          feedback: true,
          interviewer: { select: { name: true, email: true } },
        },
        orderBy: { completedAt: "asc" },
      },
    },
  });
  if (!candidate) notFound();

  // Check if candidate has active interviews
  const activeInterviewCount = await prisma.interview.count({
    where: {
      candidateId: id,
      status: { in: ["scheduled", "ongoing"] },
    },
  });

  const isExperienced = candidate.campaign?.type === "experienced";

  const interviewsData = candidate.interviews.map((i) => ({
    id: i.id,
    interviewerId: i.interviewerId,
    interviewerName: i.interviewer.name ?? i.interviewer.email,
    completedAt: i.completedAt?.toISOString() ?? null,
    result: i.feedback?.result ?? null,
    feedbackText: i.feedback?.feedback ?? null,
    pointers: i.feedback?.pointersForNextInterviewer ?? null,
    skillRatings: Array.isArray(i.feedback?.skillRatings)
      ? (i.feedback!.skillRatings as Array<{ skill: string; rating: number }>)
      : [],
  }));

  return (
    <div className="space-y-8 max-w-2xl">
      <AutoRefresh />
      <Link href={`/interviewer/campaigns/${candidate.campaignId}/candidates`} className="text-sm text-primary hover:text-primary-hover transition-colors">
        &larr; Back to candidates
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>}
          {!isExperienced && candidate.college && <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>}
          {!isExperienced && candidate.department && <p className="text-sm text-foreground-secondary">Department: {candidate.department}</p>}
          {candidate.resumeLink && (
            <p className="text-sm">
              Resume:{" "}
              <a href={candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                Open link
              </a>
            </p>
          )}
          <p className="text-sm text-foreground-secondary">Campaign: {candidate.campaign?.name}</p>
          <p className="text-sm text-foreground-secondary">Status: {candidate.status}</p>
          {candidate.currentRole && <p className="text-sm text-foreground-secondary">Current Role: {candidate.currentRole}</p>}
          {candidate.hiredRole && <p className="text-sm text-foreground-secondary">Hired Role: {candidate.hiredRole}</p>}
        </div>
      </div>

      <InterviewerCandidateDetailClient
        candidateName={candidate.name}
        interviews={interviewsData}
        currentUserId={session.user.id}
        hasActiveInterviews={activeInterviewCount > 0}
      />
    </div>
  );
}
