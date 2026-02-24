import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import CampaignNewForm from "./CampaignNewForm";

async function createCampaign(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  if (!name?.trim()) return;
  if (type !== "experienced" && type !== "fresher") return;
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      type,
      createdById: session.user.id,
    },
  });
  await auditLog({ userId: session.user.id, action: "campaign.create", entityType: "Campaign", entityId: campaign.id, metadata: { name: name.trim(), type } });
  redirect("/admin/campaigns");
}

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-md">
      <h1 className="text-4xl font-bold mb-6 text-foreground tracking-tight">New Campaign</h1>
      <CampaignNewForm createCampaign={createCampaign} />
    </div>
  );
}
