import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import AvailabilityClient from "./AvailabilityClient";

export const dynamic = "force-dynamic";

export default async function InterviewerAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, status: true },
  });

  if (!campaign) notFound();
  if (campaign.type !== "experienced" || campaign.status !== "active") {
    redirect(`/interviewer/campaigns/${id}`);
  }

  const slots = await prisma.interviewerSlot.findMany({
    where: { campaignId: id, interviewerId: session.user.id },
    select: { id: true, startTime: true },
    orderBy: { startTime: "asc" },
  });

  const serializedSlots = slots.map((s) => ({
    id: s.id,
    startTime: s.startTime.toISOString(),
  }));

  async function addSlots(startTimes: string[]) {
    "use server";
    const sess = await getServerSession(authOptions);
    if (!sess?.user?.id) return;

    const data = startTimes.map((t) => ({
      interviewerId: sess.user.id,
      campaignId: id,
      startTime: new Date(t),
    }));

    await prisma.interviewerSlot.createMany({
      data,
      skipDuplicates: true,
    });

    revalidatePath(`/interviewer/campaigns/${id}/availability`);
  }

  async function removeSlot(slotId: string) {
    "use server";
    const sess = await getServerSession(authOptions);
    if (!sess?.user?.id) return;

    await prisma.interviewerSlot.deleteMany({
      where: { id: slotId, interviewerId: sess.user.id },
    });

    revalidatePath(`/interviewer/campaigns/${id}/availability`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/interviewer/campaigns/${id}`}
          className="text-foreground-secondary hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Availability — {campaign.name}
        </h1>
      </div>

      <AvailabilityClient
        campaignId={id}
        existingSlots={serializedSlots}
        addSlots={addSlots}
        removeSlot={removeSlot}
      />
    </div>
  );
}
