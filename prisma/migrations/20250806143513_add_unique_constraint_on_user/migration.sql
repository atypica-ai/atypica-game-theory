/*
  Warnings:

  - A unique constraint covering the columns `[teamIdAsMember,personalUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TeamTokens" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserTokens" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "User_teamIdAsMember_personalUserId_key" ON "User"("teamIdAsMember", "personalUserId");
