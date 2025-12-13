/*
  Warnings:

  - You are about to drop the `FeaturedStudy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FeaturedStudy" DROP CONSTRAINT "FeaturedStudy_analystId_fkey";

-- DropForeignKey
ALTER TABLE "FeaturedStudy" DROP CONSTRAINT "FeaturedStudy_studyUserChatId_fkey";

-- DropTable
DROP TABLE "FeaturedStudy";
