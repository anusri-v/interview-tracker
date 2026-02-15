import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

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
      campaign: { select: { name: true } },
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

  const interviewedByMe = candidate.interviews.some((i) => i.interviewerId === session.user.id);
  if (!interviewedByMe) {
    const myScheduled = await prisma.interview.findFirst({
      where: { candidateId: id, interviewerId: session.user.id },
    });
    if (!myScheduled) notFound();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href="/interviewer/interviews" className="text-sm text-primary hover:text-primary-hover transition-colors">
        ← My interviews
      </Link>

      <div className="border border-border rounded-xl bg-card p-6 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">{candidate.name}</h1>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-foreground-secondary">{candidate.email}</p>
          {candidate.phone && <p className="text-sm text-foreground-secondary">Phone: {candidate.phone}</p>}
          {candidate.college && <p className="text-sm text-foreground-secondary">College: {candidate.college}</p>}
          {candidate.department && <p className="text-sm text-foreground-secondary">Department: {candidate.department}</p>}
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
          {candidate.role && <p className="text-sm text-foreground-secondary">Role: {candidate.role}</p>}
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3 text-foreground tracking-tight">Past Interview Feedbacks</h2>
        {candidate.interviews.length === 0 ? (
          <p className="text-foreground-muted text-sm">No completed interviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {candidate.interviews.map((i) => (
              <li key={i.id} className="border border-border rounded-xl bg-card p-4 text-sm text-foreground">
                <p className="font-medium">{i.interviewer.name ?? i.interviewer.email}</p>
                {i.feedback && (
                  <>
                    <p className="mt-2">
                      <span className="font-medium">Result: </span>
                      <StatusBadge variant={i.feedback.result as any} />
                    </p>
                    <p className="mt-2 text-foreground-secondary">{i.feedback.feedback}</p>
                    <p className="mt-1 text-foreground-muted">Pointers: {i.feedback.pointersForNextInterviewer}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
