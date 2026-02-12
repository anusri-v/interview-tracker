import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  let body: {
    candidates: {
      name: string;
      email: string;
      phone?: string;
      college?: string;
      department?: string;
      resumeLink?: string;
    }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
    return NextResponse.json({ error: "candidates array required" }, { status: 400 });
  }
  const created = await prisma.candidate.createMany({
    data: body.candidates.map((c) => ({
      campaignId,
      name: String(c.name).trim(),
      email: String(c.email).trim(),
      phone: c.phone?.trim() || null,
      college: c.college?.trim() || null,
      department: c.department?.trim() || null,
      resumeLink: c.resumeLink?.trim() || null,
    })),
    skipDuplicates: true,
  });
  return NextResponse.json({ created: created.count });
}
