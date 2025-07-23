/*
  Warnings:

  - You are about to rename the `InterviewProject` table to `InterviewProjectLegacy`.
  - You are about to rename the `InterviewSession` table to `InterviewSessionLegacy`.

*/

-- Rename tables
ALTER TABLE "InterviewProject" RENAME TO "InterviewProjectLegacy";
ALTER TABLE "InterviewSession" RENAME TO "InterviewSessionLegacy";

-- Rename primary key constraints
ALTER TABLE "InterviewProjectLegacy" RENAME CONSTRAINT "InterviewProject_pkey" TO "InterviewProjectLegacy_pkey";
ALTER TABLE "InterviewSessionLegacy" RENAME CONSTRAINT "InterviewSession_pkey" TO "InterviewSessionLegacy_pkey";

-- Rename foreign key constraints
ALTER TABLE "InterviewProjectLegacy" RENAME CONSTRAINT "InterviewProject_userId_fkey" TO "InterviewProjectLegacy_userId_fkey";
ALTER TABLE "InterviewSessionLegacy" RENAME CONSTRAINT "InterviewSession_projectId_fkey" TO "InterviewSessionLegacy_projectId_fkey";
ALTER TABLE "InterviewSessionLegacy" RENAME CONSTRAINT "InterviewSession_userChatId_fkey" TO "InterviewSessionLegacy_userChatId_fkey";

-- Rename unique indexes
ALTER INDEX "InterviewProject_token_key" RENAME TO "InterviewProjectLegacy_token_key";
ALTER INDEX "InterviewSession_token_key" RENAME TO "InterviewSessionLegacy_token_key";
ALTER INDEX "InterviewSession_userChatId_key" RENAME TO "InterviewSessionLegacy_userChatId_key";
