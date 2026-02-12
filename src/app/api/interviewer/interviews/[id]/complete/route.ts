import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  let body: { result: string; feedback: string; pointersForNextInterviewer: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validResults = ["HIRE", "NO_HIRE", "WEAK_HIRE"];
  if (!body.result || !validResults.includes(body.result) || !body.feedback || !body.pointersForNextInterviewer) {
    return NextResponse.json(
      { error: "result (HIRE, NO_HIRE, WEAK_HIRE), feedback and pointersForNextInterviewer required" },
      { status: 400 }
    );
  }
  await prisma.$transaction([
    prisma.feedback.create({
      data: {
        interviewId: id,
        result: body.result as "HIRE" | "NO_HIRE" | "WEAK_HIRE",
        feedback: body.feedback,
        pointersForNextInterviewer: body.pointersForNextInterviewer,
      },
    }),
    prisma.interview.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
