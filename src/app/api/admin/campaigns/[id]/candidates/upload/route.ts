import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

type CandidateRow = {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  resumeLink?: string;
  currentRole?: string;
  rounds?: { interviewerEmail: string; result: string; feedback?: string }[];
};

const VALID_RESULTS = ["HIRE", "NO_HIRE", "WEAK_HIRE", "NO_SHOW"];

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

  let body: { candidates: CandidateRow[] };
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
    currentRole: campaign.type === "fresher" ? "Fresher" : (c.currentRole?.trim() || null),
  }));

  const created = await prisma.candidate.createMany({
    data: mapped,
    skipDuplicates: true,
  });

  // Check if any candidates have interview history
  const candidatesWithRounds = body.candidates.filter(
    (c) => c.rounds && c.rounds.length > 0
  );

  let interviewsCreated = 0;
  const warnings: string[] = [];

  if (candidatesWithRounds.length > 0) {
    // Fetch all created/existing candidates by email to get IDs
    const emails = [...new Set(body.candidates.map((c) => String(c.email).trim()))];
    const dbCandidates = await prisma.candidate.findMany({
      where: { campaignId, email: { in: emails } },
      select: { id: true, email: true },
    });
    const candidateByEmail: Record<string, string> = {};
    for (const c of dbCandidates) {
      candidateByEmail[c.email.toLowerCase()] = c.id;
    }

    // Collect all unique interviewer emails, look up in User table
    const interviewerEmails = [
      ...new Set(
        candidatesWithRounds.flatMap(
          (c) => c.rounds!.map((r) => r.interviewerEmail.trim().toLowerCase())
        )
      ),
    ];
    const dbUsers = await prisma.user.findMany({
      where: { email: { in: interviewerEmails } },
      select: { id: true, email: true },
    });
    const userByEmail: Record<string, string> = {};
    for (const u of dbUsers) {
      userByEmail[u.email.toLowerCase()] = u.id;
    }

    // Process each candidate with rounds
    for (const c of candidatesWithRounds) {
      const candidateEmail = String(c.email).trim().toLowerCase();
      const candidateId = candidateByEmail[candidateEmail];
      if (!candidateId) continue;

      let lastResult: string | null = null;

      for (const round of c.rounds!) {
        const interviewerEmail = round.interviewerEmail.trim().toLowerCase();
        const interviewerId = userByEmail[interviewerEmail];
        if (!interviewerId) {
          warnings.push(`Interviewer "${round.interviewerEmail}" not found — skipped for ${c.email}`);
          continue;
        }

        const result = round.result.trim().toUpperCase().replace(/\s+/g, "_");
        if (!VALID_RESULTS.includes(result)) {
          warnings.push(`Invalid result "${round.result}" — skipped for ${c.email}`);
          continue;
        }

        try {
          await prisma.interview.create({
            data: {
              candidateId,
              interviewerId,
              scheduledAt: new Date(),
              status: "completed",
              completedAt: new Date(),
              feedback: {
                create: {
                  result: result as any,
                  feedback: round.feedback?.trim() || null,
                },
              },
            },
          });
          interviewsCreated++;
          lastResult = result;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            warnings.push(`Duplicate interview: ${interviewerEmail} → ${c.email} — skipped`);
            continue;
          }
          throw error;
        }
      }

      // Update candidate status based on last round result
      if (lastResult) {
        let newStatus: string | null = null;
        if (lastResult === "NO_HIRE") newStatus = "rejected";
        else if (lastResult === "NO_SHOW") newStatus = "no_show";
        // HIRE/WEAK_HIRE → keep in_pipeline (they continue)

        if (newStatus) {
          await prisma.candidate.update({
            where: { id: candidateId },
            data: { status: newStatus as any },
          });
        }
      }
    }
  }

  await auditLog({ userId: session.user.id, action: "candidate.bulk_upload", entityType: "Campaign", entityId: campaignId, metadata: { total, created: created.count, skipped: total - created.count, interviewsCreated } });

  return NextResponse.json({
    created: created.count,
    total,
    skipped: total - created.count,
    interviewsCreated,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}
