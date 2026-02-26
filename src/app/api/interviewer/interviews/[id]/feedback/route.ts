import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      feedback: true,
      candidate: {
        select: {
          id: true,
          interviews: {
            where: { status: { in: ["scheduled", "ongoing"] } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!interview) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Auth: must be original interviewer or admin
  const isOriginalInterviewer = interview.interviewerId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOriginalInterviewer && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Validate: must be completed with WEAK_HIRE feedback
  if (interview.status !== "completed" || !interview.feedback) {
    return NextResponse.json({ error: "Interview must be completed with feedback" }, { status: 400 });
  }
  if (interview.feedback.result !== "WEAK_HIRE") {
    return NextResponse.json({ error: "Can only edit WEAK_HIRE feedback" }, { status: 400 });
  }

  // Validate: candidate must have no active interviews
  if (interview.candidate.interviews.length > 0) {
    return NextResponse.json({ error: "Cannot edit while candidate has active interviews" }, { status: 400 });
  }

  let body: {
    result: string;
    feedback: string;
    pointersForNextInterviewer?: string;
    skillRatings?: Array<{ skill: string; rating: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validResults = ["HIRE", "NO_HIRE", "WEAK_HIRE"];
  if (!body.result || !validResults.includes(body.result) || !body.feedback) {
    return NextResponse.json(
      { error: "result (HIRE, NO_HIRE, WEAK_HIRE) and feedback required" },
      { status: 400 }
    );
  }

  if (body.skillRatings && Array.isArray(body.skillRatings)) {
    for (const sr of body.skillRatings) {
      if (!sr.skill || typeof sr.skill !== "string" || !sr.skill.trim()) {
        return NextResponse.json({ error: "Each skill rating must have a non-empty skill name" }, { status: 400 });
      }
      if (typeof sr.rating !== "number" || sr.rating < 1 || sr.rating > 5 || !Number.isInteger(sr.rating)) {
        return NextResponse.json({ error: "Each skill rating must have a rating between 1 and 5" }, { status: 400 });
      }
    }
  }

  const pointers = body.pointersForNextInterviewer?.trim() || null;
  const skillRatings = body.skillRatings && body.skillRatings.length > 0
    ? body.skillRatings.map((sr) => ({ skill: sr.skill.trim(), rating: sr.rating }))
    : null;

  const updates = [
    prisma.feedback.update({
      where: { id: interview.feedback.id },
      data: {
        result: body.result as "HIRE" | "NO_HIRE" | "WEAK_HIRE",
        feedback: body.feedback,
        pointersForNextInterviewer: pointers,
        skillRatings: skillRatings ?? undefined,
      },
    }),
  ];

  // If result changed to NO_HIRE, also reject the candidate
  if (body.result === "NO_HIRE") {
    updates.push(
      prisma.candidate.update({
        where: { id: interview.candidateId },
        data: { status: "rejected" },
      }) as any
    );
  }

  await prisma.$transaction(updates);

  await auditLog({
    userId: session.user.id,
    action: "feedback.edit",
    entityType: "Feedback",
    entityId: interview.feedback.id,
    metadata: {
      interviewId: id,
      candidateId: interview.candidateId,
      oldResult: interview.feedback.result,
      newResult: body.result,
    },
  });

  return NextResponse.json({ ok: true });
}
