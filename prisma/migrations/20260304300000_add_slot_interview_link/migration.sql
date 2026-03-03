-- Add interviewId to InterviewerSlot to link slots with interviews
ALTER TABLE "InterviewerSlot" ADD COLUMN "interviewId" TEXT;

-- Create unique constraint
CREATE UNIQUE INDEX "InterviewerSlot_interviewId_key" ON "InterviewerSlot"("interviewId");

-- Add foreign key constraint
ALTER TABLE "InterviewerSlot" ADD CONSTRAINT "InterviewerSlot_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
