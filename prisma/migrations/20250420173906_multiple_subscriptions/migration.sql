/*
  Warnings:

  - Made the column `endsAt` on table `UserSubscription` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `UserSubscription` DROP FOREIGN KEY `UserSubscription_userId_fkey`;

-- DropIndex
DROP INDEX `UserSubscription_userId_key` ON `UserSubscription`;

-- AlterTable
ALTER TABLE `UserSubscription` ALTER COLUMN `startsAt` DROP DEFAULT,
    MODIFY `endsAt` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `UserSubscription` ADD CONSTRAINT `UserSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
