import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEBUG_LOG = join(process.cwd(), ".cursor", "debug.log");
function debugLog(payload: Record<string, unknown>) {
  try {
    mkdirSync(join(process.cwd(), ".cursor"), { recursive: true });
    appendFileSync(DEBUG_LOG, JSON.stringify(payload) + "\n");
  } catch {}
}

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
  if (campaign.status === "completed") {
    return NextResponse.json({ error: "Campaign is completed; cannot add candidates" }, { status: 400 });
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
  const total = body.candidates.length;
  const mapped = body.candidates.map((c) => ({
    campaignId,
    name: String(c.name).trim(),
    email: String(c.email).trim(),
    phone: c.phone?.trim() || null,
    college: c.college?.trim() || null,
    department: c.department?.trim() || null,
    resumeLink: c.resumeLink?.trim() || null,
  }));
  // #region agent log
  const payloadEmails = [...new Set(mapped.map((r) => r.email))];
  const payloadPhones = [...new Set(mapped.map((r) => r.phone).filter(Boolean))];
  const existingByEmail = await prisma.candidate.count({ where: { campaignId, email: { in: payloadEmails } } });
  const existingByPhone = payloadPhones.length
    ? await prisma.candidate.count({ where: { campaignId, phone: { in: payloadPhones } } })
    : 0;
  const preLog = { location: "route.ts:upload", message: "upload pre createMany", data: { campaignId, total, mappedLen: mapped.length, uniqueEmails: payloadEmails.length, uniquePhones: payloadPhones.length, existingByEmail, existingByPhone, sampleEmail: payloadEmails[0] }, timestamp: Date.now(), hypothesisId: "H1-H5" };
  debugLog(preLog);
  fetch("http://127.0.0.1:7242/ingest/fdb5a47c-4919-4072-865c-1921ccac8d65", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preLog) }).catch(() => {});
  // #endregion
  const created = await prisma.candidate.createMany({
    data: mapped,
    skipDuplicates: true,
  });
  // #region agent log
  const postLog = { location: "route.ts:upload", message: "upload post createMany", data: { createdCount: created.count, total, skipped: total - created.count }, timestamp: Date.now(), hypothesisId: "H1-H5" };
  debugLog(postLog);
  fetch("http://127.0.0.1:7242/ingest/fdb5a47c-4919-4072-865c-1921ccac8d65", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(postLog) }).catch(() => {});
  // #endregion
  return NextResponse.json({ created: created.count, total, skipped: total - created.count });
}
