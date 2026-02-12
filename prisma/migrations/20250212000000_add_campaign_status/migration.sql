-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'completed');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "status" "CampaignStatus" NOT NULL DEFAULT 'active';
