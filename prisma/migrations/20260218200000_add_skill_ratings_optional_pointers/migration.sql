-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "skillRatings" JSONB;

-- AlterTable
ALTER TABLE "Feedback" ALTER COLUMN "pointersForNextInterviewer" DROP NOT NULL;
