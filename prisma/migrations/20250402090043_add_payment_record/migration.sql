-- CreateTable
CREATE TABLE `PaymentRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `orderNo` VARCHAR(64) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `paymentMethod` VARCHAR(64) NOT NULL,
    `charge` JSON NOT NULL,
    `chargeId` VARCHAR(64) NOT NULL,
    `credential` JSON NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentRecord_orderNo_key`(`orderNo`),
    UNIQUE INDEX `PaymentRecord_chargeId_key`(`chargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
