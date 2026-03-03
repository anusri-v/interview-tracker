-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('online', 'offline');

-- CreateTable
CREATE TABLE "InterviewerCampaignSetting" (
    "id" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "mode" "InterviewMode",
    "roomNumber" TEXT,
    "meetLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewerCampaignSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewerCampaignSetting_interviewerId_campaignId_key" ON "InterviewerCampaignSetting"("interviewerId", "campaignId");

-- AddForeignKey
ALTER TABLE "InterviewerCampaignSetting" ADD CONSTRAINT "InterviewerCampaignSetting_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerCampaignSetting" ADD CONSTRAINT "InterviewerCampaignSetting_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
