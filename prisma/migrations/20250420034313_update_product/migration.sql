/*
  Warnings:

  - A unique constraint covering the columns `[name,currency]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Product_name_key` ON `Product`;

-- AlterTable
ALTER TABLE `PaymentRecord` ALTER COLUMN `currency` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Product` ALTER COLUMN `currency` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `Product_name_currency_key` ON `Product`(`name`, `currency`);
