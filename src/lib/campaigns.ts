import type { PrismaClient } from "@prisma/client";

/**
 * Returns the default campaign ID to select: latest active campaign, or if none, latest completed campaign.
 * For interviewer, only among campaigns where they have at least one interview.
 */
export async function getDefaultCampaignId(
  prisma: PrismaClient,
  options: { isAdmin: boolean; userId?: string }
): Promise<string | null> {
  const { isAdmin, userId } = options;
  const interviewFilter =
    !isAdmin && userId
      ? {
          candidates: {
            some: {
              interviews: { some: { interviewerId: userId } },
            },
          },
        }
      : {};

  const active = await prisma.campaign.findFirst({
    where: { status: "active", ...interviewFilter },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (active) return active.id;

  const completed = await prisma.campaign.findFirst({
    where: { status: "completed", ...interviewFilter },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return completed?.id ?? null;
}
