import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function POST(
  _request: Request,
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
  if (interview.status !== "scheduled") {
    return NextResponse.json({ error: "Interview not in scheduled state" }, { status: 400 });
  }
  await prisma.interview.update({
    where: { id },
    data: { status: "ongoing", startedAt: new Date() },
  });
  await auditLog({ userId: session.user.id, action: "interview.start", entityType: "Interview", entityId: id });
  return NextResponse.json({ ok: true });
}
