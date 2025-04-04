/*
  Warnings:

  - You are about to alter the column `dimension` on the `ChatStatistics` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Enum(EnumId(1))`.
  - You are about to alter the column `status` on the `PaymentRecord` table. The data in that column could be lost. The data in that column will be cast from `VarChar(32)` to `Enum(EnumId(2))`.
  - You are about to alter the column `kind` on the `UserChat` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Enum(EnumId(0))`.
  - You are about to alter the column `verb` on the `UserPointsLog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `Enum(EnumId(3))`.
  - You are about to alter the column `resourceType` on the `UserPointsLog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `ChatStatistics` MODIFY `dimension` ENUM('tokens', 'duration', 'steps', 'personas', 'interviews') NOT NULL;

-- AlterTable
ALTER TABLE `PaymentRecord` MODIFY `status` ENUM('pending', 'succeeded', 'failed') NOT NULL;

-- AlterTable
ALTER TABLE `UserChat` MODIFY `kind` ENUM('scout', 'study') NOT NULL;

-- AlterTable
ALTER TABLE `UserPointsLog` MODIFY `verb` ENUM('recharge', 'consume', 'daily', 'gift', 'signup') NOT NULL,
    MODIFY `resourceType` ENUM('StudyUserChat', 'ScoutUserChat', 'PaymentRecord') NULL;
