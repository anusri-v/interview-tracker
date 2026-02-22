-- CreateTable
CREATE TABLE "InterviewerSlot" (
    "id" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewerSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewerSlot_campaignId_interviewerId_idx" ON "InterviewerSlot"("campaignId", "interviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewerSlot_interviewerId_campaignId_startTime_key" ON "InterviewerSlot"("interviewerId", "campaignId", "startTime");

-- AddForeignKey
ALTER TABLE "InterviewerSlot" ADD CONSTRAINT "InterviewerSlot_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewerSlot" ADD CONSTRAINT "InterviewerSlot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
