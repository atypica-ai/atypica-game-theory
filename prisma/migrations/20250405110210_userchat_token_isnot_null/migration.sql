/*
  Warnings:

  - Made the column `token` on table `UserChat` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `UserChat` MODIFY `token` VARCHAR(64) NOT NULL;
