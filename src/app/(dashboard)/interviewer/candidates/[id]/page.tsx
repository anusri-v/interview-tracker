import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

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
    <div className="space-y-6 max-w-2xl">
      <Link href="/interviewer/interviews" className="text-sm text-blue-600 hover:underline">
        ← My interviews
      </Link>

      <div className="border rounded p-4">
        <h1 className="text-xl font-bold">{candidate.name}</h1>
        <p className="text-sm text-gray-500">{candidate.email}</p>
        {candidate.phone && <p className="text-sm">Phone: {candidate.phone}</p>}
        {candidate.college && <p className="text-sm">College: {candidate.college}</p>}
        {candidate.department && <p className="text-sm">Department: {candidate.department}</p>}
        {candidate.resumeLink && (
          <p className="text-sm">
            Resume:{" "}
            <a href={candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Open link
            </a>
          </p>
        )}
        <p className="text-sm">Campaign: {candidate.campaign?.name}</p>
        <p className="text-sm">Status: {candidate.status}</p>
        {candidate.role && <p className="text-sm">Role: {candidate.role}</p>}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Past interview feedbacks</h2>
        {candidate.interviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No completed interviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {candidate.interviews.map((i) => (
              <li key={i.id} className="border rounded p-3 text-sm">
                <p className="font-medium">{i.interviewer.name ?? i.interviewer.email}</p>
                {i.feedback && (
                  <>
                    <p className="mt-1">
                      <span className="font-medium">Result: </span>
                      <span className="text-gray-700 dark:text-gray-300">{i.feedback.result.replace("_", " ")}</span>
                    </p>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">{i.feedback.feedback}</p>
                    <p className="mt-1 text-gray-500">Pointers: {i.feedback.pointersForNextInterviewer}</p>
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
