import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { campaignId: string; mode: string; roomNumber?: string; meetLink?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId || !body.mode || !["online", "offline"].includes(body.mode)) {
    return NextResponse.json({ error: "campaignId and mode (online/offline) required" }, { status: 400 });
  }

  const data: {
    mode: "online" | "offline";
    roomNumber: string | null;
    meetLink: string | null;
  } = {
    mode: body.mode as "online" | "offline",
    roomNumber: body.mode === "offline" ? (body.roomNumber?.trim() || null) : null,
    meetLink: body.mode === "online" ? (body.meetLink?.trim() || null) : null,
  };

  await prisma.interviewerCampaignSetting.upsert({
    where: {
      interviewerId_campaignId: {
        interviewerId: session.user.id,
        campaignId: body.campaignId,
      },
    },
    update: data,
    create: {
      interviewerId: session.user.id,
      campaignId: body.campaignId,
      ...data,
    },
  });

  return NextResponse.json({ ok: true });
}
