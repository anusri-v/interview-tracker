import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getDisplayStatus(c: {
  status: string;
  interviews: { status: string }[];
}): string {
  if (c.status === "rejected") return "rejected";
  if (c.status === "selected") return "selected";
  if (c.status === "no_show") return "no_show";
  const hasOngoing = c.interviews.some((i) => i.status === "ongoing");
  const hasScheduled = c.interviews.some((i) => i.status === "scheduled");
  if (hasOngoing) return "interview_ongoing";
  if (hasScheduled) return "interview_scheduled";
  return "in_pipeline";
}

function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        include: {
          interviews: {
            select: {
              status: true,
              feedback: { select: { result: true } },
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    return new Response("Campaign not found", { status: 404 });
  }

  const headers = [
    "name",
    "email",
    "phone",
    "college",
    "department",
    "status",
    "current_role",
    "hired_role",
    "round",
  ];
  const headerLine = headers.join(",");

  const rows = campaign.candidates.map((c) => {
    const displayStatus = getDisplayStatus(c);
    const completedPassed = c.interviews.filter(
      (i) =>
        i.status === "completed" &&
        i.feedback &&
        (i.feedback.result === "HIRE" || i.feedback.result === "WEAK_HIRE")
    ).length;
    const round = completedPassed + 1;
    return [
      escapeCsvCell(c.name),
      escapeCsvCell(c.email),
      escapeCsvCell(c.phone),
      escapeCsvCell(c.college),
      escapeCsvCell(c.department),
      escapeCsvCell(displayStatus),
      escapeCsvCell(c.currentRole),
      escapeCsvCell(c.hiredRole),
      escapeCsvCell(String(round)),
    ].join(",");
  });

  const csv = [headerLine, ...rows].join("\r\n");
  const filename = `candidates-${campaign.name.replace(/[^a-zA-Z0-9-_]/g, "-")}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
