import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview || interview.interviewerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (interview.status !== "ongoing") {
    return NextResponse.json({ error: "Interview not ongoing" }, { status: 400 });
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
  const validResults = ["HIRE", "NO_HIRE", "WEAK_HIRE", "NO_SHOW"];
  if (!body.result || !validResults.includes(body.result) || !body.feedback) {
    return NextResponse.json(
      { error: "result (HIRE, NO_HIRE, WEAK_HIRE, NO_SHOW) and feedback required" },
      { status: 400 }
    );
  }
  // Validate skill ratings if provided
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

  // Panel flow
  if (interview.panelGroupId) {
    // Check if PanelFeedback already exists
    const existingPanelFeedback = await prisma.panelFeedback.findUnique({
      where: { panelGroupId: interview.panelGroupId },
    });
    if (existingPanelFeedback) {
      return NextResponse.json({ error: "Feedback already submitted for this panel" }, { status: 400 });
    }

    // Get all interviews in the panel group
    const panelInterviews = await prisma.interview.findMany({
      where: { panelGroupId: interview.panelGroupId },
    });

    const now = new Date();

    const candidateStatusUpdate =
      body.result === "NO_HIRE"
        ? [prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: "rejected" } })]
        : body.result === "NO_SHOW"
        ? [prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: "no_show" } })]
        : [];

    // Transaction: create PanelFeedback, create individual Feedback for each, update all to completed
    await prisma.$transaction([
      prisma.panelFeedback.create({
        data: {
          panelGroupId: interview.panelGroupId,
          result: body.result as "HIRE" | "NO_HIRE" | "WEAK_HIRE" | "NO_SHOW",
          feedback: body.feedback,
          skillRatings: skillRatings ?? undefined,
          pointersForNextInterviewer: pointers,
          submittedById: session.user.id,
        },
      }),
      // Create individual feedback for each panel interview (preserves existing join queries)
      ...panelInterviews.map((pi) =>
        prisma.feedback.create({
          data: {
            interviewId: pi.id,
            result: body.result as "HIRE" | "NO_HIRE" | "WEAK_HIRE" | "NO_SHOW",
            feedback: body.feedback,
            pointersForNextInterviewer: pointers,
            skillRatings: skillRatings ?? undefined,
          },
        })
      ),
      // Mark all panel interviews as completed
      prisma.interview.updateMany({
        where: { panelGroupId: interview.panelGroupId },
        data: { status: "completed", completedAt: now },
      }),
      ...candidateStatusUpdate,
    ]);
  } else {
    // Solo flow
    const candidateStatusUpdate =
      body.result === "NO_HIRE"
        ? [prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: "rejected" } })]
        : body.result === "NO_SHOW"
        ? [prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: "no_show" } })]
        : [];

    await prisma.$transaction([
      prisma.feedback.create({
        data: {
          interviewId: id,
          result: body.result as "HIRE" | "NO_HIRE" | "WEAK_HIRE" | "NO_SHOW",
          feedback: body.feedback,
          pointersForNextInterviewer: pointers,
          skillRatings: skillRatings ?? undefined,
        },
      }),
      prisma.interview.update({
        where: { id },
        data: { status: "completed", completedAt: new Date() },
      }),
      ...candidateStatusUpdate,
    ]);
  }

  await auditLog({ userId: session.user.id, action: "interview.complete", entityType: "Interview", entityId: id, metadata: { result: body.result, candidateId: interview.candidateId } });
  return NextResponse.json({ ok: true });
}
