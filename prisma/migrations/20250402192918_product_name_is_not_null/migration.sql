/*
  Warnings:

  - Made the column `productName` on table `PaymentLine` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `PaymentLine` MODIFY `productName` VARCHAR(64) NOT NULL;
