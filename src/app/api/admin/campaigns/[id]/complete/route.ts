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
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      candidates: {
        where: { status: "in_pipeline" },
        select: { id: true, name: true, email: true },
      },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status === "completed") {
    return NextResponse.json({ error: "Campaign is already completed" }, { status: 400 });
  }
  if (campaign.candidates.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot complete: some candidates are still in pipeline",
        pipelineCandidates: campaign.candidates,
      },
      { status: 400 }
    );
  }
  await prisma.campaign.update({
    where: { id },
    data: { status: "completed" },
  });
  await auditLog({ userId: session.user.id, action: "campaign.complete", entityType: "Campaign", entityId: id });
  return NextResponse.json({ ok: true });
}
