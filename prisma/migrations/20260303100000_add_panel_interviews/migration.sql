-- Add panelGroupId to Interview for panel interview grouping
ALTER TABLE "Interview" ADD COLUMN "panelGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Interview_panelGroupId_idx" ON "Interview"("panelGroupId");

-- CreateTable
CREATE TABLE "PanelFeedback" (
    "id" TEXT NOT NULL,
    "panelGroupId" TEXT NOT NULL,
    "result" "InterviewResult" NOT NULL,
    "feedback" TEXT,
    "skillRatings" JSONB,
    "pointersForNextInterviewer" TEXT,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanelFeedback_panelGroupId_key" ON "PanelFeedback"("panelGroupId");

-- AddForeignKey
ALTER TABLE "PanelFeedback" ADD CONSTRAINT "PanelFeedback_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
