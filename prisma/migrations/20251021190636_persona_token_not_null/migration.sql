/*
  Warnings:

  - Made the column `token` on table `Persona` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Persona" ALTER COLUMN "token" SET NOT NULL;
