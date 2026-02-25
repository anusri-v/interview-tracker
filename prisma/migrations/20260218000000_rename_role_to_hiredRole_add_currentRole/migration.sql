-- AlterTable: rename role -> hiredRole, add currentRole
ALTER TABLE "Candidate" RENAME COLUMN "role" TO "hiredRole";
ALTER TABLE "Candidate" ADD COLUMN "currentRole" TEXT;
