-- Add lateral-specific candidate fields
ALTER TABLE "Candidate" ADD COLUMN "dateFirstSpoken" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN "source" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "yearsOfExperience" DOUBLE PRECISION;
ALTER TABLE "Candidate" ADD COLUMN "company" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "location" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "currentCtc" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "expectedCtc" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "dropReason" TEXT;
