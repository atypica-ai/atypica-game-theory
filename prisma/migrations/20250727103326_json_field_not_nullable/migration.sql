/*
  Warnings:

  - Made the column `attachments` on table `Analyst` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `AnalystReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `AttachmentFile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `ChatMessage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `attachments` on table `ChatMessage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `ChatStatistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `ImageGeneration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analysis` on table `PersonaImport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `PersonaImport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastLogin` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `UserChat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `extra` on table `UserSubscription` required. This step will fail if there are existing NULL values in that column.

  Update NULL values to empty JSON object before making columns NOT NULL:

  UPDATE "Analyst" SET "attachments" = '{}' WHERE "attachments" IS NULL;
  UPDATE "AnalystReport" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "AttachmentFile" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "ChatMessage" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "ChatMessage" SET "attachments" = '{}' WHERE "attachments" IS NULL;
  UPDATE "ChatStatistics" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "ImageGeneration" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "PersonaImport" SET "analysis" = '{}' WHERE "analysis" IS NULL;
  UPDATE "PersonaImport" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "Product" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "User" SET "lastLogin" = '{}' WHERE "lastLogin" IS NULL;
  UPDATE "UserChat" SET "extra" = '{}' WHERE "extra" IS NULL;
  UPDATE "UserSubscription" SET "extra" = '{}' WHERE "extra" IS NULL;
*/

-- AlterTable
ALTER TABLE "Analyst" ALTER COLUMN "attachments" SET NOT NULL,
ALTER COLUMN "attachments" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "AnalystReport" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "AttachmentFile" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}',
ALTER COLUMN "attachments" SET NOT NULL,
ALTER COLUMN "attachments" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "ChatStatistics" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "ImageGeneration" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "PersonaImport" ALTER COLUMN "analysis" SET NOT NULL,
ALTER COLUMN "analysis" SET DEFAULT '{}',
ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "lastLogin" SET NOT NULL,
ALTER COLUMN "lastLogin" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserChat" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserSubscription" ALTER COLUMN "extra" SET NOT NULL,
ALTER COLUMN "extra" SET DEFAULT '{}';
