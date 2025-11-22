/*
  Warnings:

  - You are about to drop the column `extra` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "extra",
DROP COLUMN "lastLogin";
