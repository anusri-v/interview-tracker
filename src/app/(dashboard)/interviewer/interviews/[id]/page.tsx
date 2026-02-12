import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import StartInterviewButton from "./StartInterviewButton";
import CompleteInterviewForm from "./CompleteInterviewForm";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: {
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
      },
      feedback: true,
    },
  });

  if (!interview || interview.interviewerId !== session.user.id) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/interviewer/interviews" className="text-sm text-blue-600 hover:underline">
        ← My interviews
      </Link>

      <div className="border rounded p-4">
        <h1 className="text-xl font-bold">Interview: {interview.candidate.name}</h1>
        <p className="text-sm text-gray-500">
          {interview.candidate.email} · {interview.candidate.campaign?.name}
        </p>
        {interview.candidate.phone && <p className="text-sm">Phone: {interview.candidate.phone}</p>}
        {interview.candidate.college && <p className="text-sm">College: {interview.candidate.college}</p>}
        {interview.candidate.department && <p className="text-sm">Department: {interview.candidate.department}</p>}
        {interview.candidate.resumeLink && (
          <p className="text-sm">
            Resume:{" "}
            <a href={interview.candidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Open link
            </a>
          </p>
        )}
        <p className="text-sm mt-1">
          Scheduled: {new Date(interview.scheduledAt).toLocaleString()} · Status: {interview.status}
        </p>
      </div>

      {interview.candidate.interviews.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Past interview feedbacks</h2>
          <ul className="space-y-3">
            {interview.candidate.interviews.map((i) => (
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
        </section>
      )}

      {interview.status === "scheduled" && (
        <StartInterviewButton interviewId={interview.id} />
      )}

      {interview.status === "ongoing" && (
        <CompleteInterviewForm interviewId={interview.id} />
      )}

      {interview.status === "completed" && interview.feedback && (
        <div className="border rounded p-4 bg-gray-50 dark:bg-zinc-800">
          <h2 className="font-semibold mb-2">Your feedback</h2>
          <p className="text-sm">
            <span className="font-medium">Result: </span>
            {interview.feedback.result.replace("_", " ")}
          </p>
          <p className="text-sm mt-2">{interview.feedback.feedback}</p>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
            Pointers for next: {interview.feedback.pointersForNextInterviewer}
          </p>
        </div>
      )}
    </div>
  );
}
