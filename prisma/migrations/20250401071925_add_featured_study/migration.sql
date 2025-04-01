-- CreateTable
CREATE TABLE `FeaturedStudy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `analystId` INTEGER NOT NULL,
    `studyUserChatId` INTEGER NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeaturedStudy_analystId_key`(`analystId`),
    UNIQUE INDEX `FeaturedStudy_studyUserChatId_key`(`studyUserChatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeaturedStudy` ADD CONSTRAINT `FeaturedStudy_analystId_fkey` FOREIGN KEY (`analystId`) REFERENCES `Analyst`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeaturedStudy` ADD CONSTRAINT `FeaturedStudy_studyUserChatId_fkey` FOREIGN KEY (`studyUserChatId`) REFERENCES `UserChat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
