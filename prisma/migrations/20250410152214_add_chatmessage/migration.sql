/*
  Warnings:

  - A unique constraint covering the columns `[interviewUserChatId]` on the table `AnalystInterview` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `AnalystInterview` ADD COLUMN `interviewUserChatId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserChat` MODIFY `kind` ENUM('scout', 'study', 'interview', 'misc') NOT NULL;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messageId` VARCHAR(64) NOT NULL,
    `userChatId` INTEGER NOT NULL,
    `role` ENUM('system', 'user', 'assistant', 'data') NOT NULL,
    `content` TEXT NOT NULL,
    `parts` JSON NOT NULL,
    `extra` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChatMessage_messageId_key`(`messageId`),
    INDEX `ChatMessage_userChatId_id_idx`(`userChatId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `AnalystInterview_interviewUserChatId_key` ON `AnalystInterview`(`interviewUserChatId`);

-- AddForeignKey
ALTER TABLE `AnalystInterview` ADD CONSTRAINT `AnalystInterview_interviewUserChatId_fkey` FOREIGN KEY (`interviewUserChatId`) REFERENCES `UserChat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_userChatId_fkey` FOREIGN KEY (`userChatId`) REFERENCES `UserChat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
