-- AlterTable
ALTER TABLE `PaymentLine` ADD COLUMN `currency` ENUM('CNY', 'USD') NOT NULL DEFAULT 'CNY';

-- AlterTable
ALTER TABLE `PaymentRecord` ADD COLUMN `currency` ENUM('CNY', 'USD') NOT NULL DEFAULT 'CNY',
    MODIFY `chargeId` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `currency` ENUM('CNY', 'USD') NOT NULL DEFAULT 'CNY',
    ADD COLUMN `extra` JSON NULL;
