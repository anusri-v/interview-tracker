-- Add post-selection CandidateStatus enum values
ALTER TYPE "CandidateStatus" ADD VALUE 'dropped';
ALTER TYPE "CandidateStatus" ADD VALUE 'offer_in_process';
ALTER TYPE "CandidateStatus" ADD VALUE 'offer_accepted';
