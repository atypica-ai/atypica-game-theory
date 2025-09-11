-- DropIndex
DROP INDEX "PaymentRecord_chargeId_key";

-- AlterTable
ALTER TABLE "PaymentRecord" RENAME COLUMN "charge" TO "pingxxCharge";
ALTER TABLE "PaymentRecord" RENAME COLUMN "chargeId" TO "pingxxChargeId";
ALTER TABLE "PaymentRecord" RENAME COLUMN "credential" TO "pingxxCredential";
ALTER TABLE "PaymentRecord" ALTER COLUMN "pingxxCharge" SET DEFAULT '{}';
ALTER TABLE "PaymentRecord" ALTER COLUMN "pingxxChargeId" DROP NOT NULL;
ALTER TABLE "PaymentRecord" ALTER COLUMN "pingxxCredential" SET DEFAULT '{}';
ALTER TABLE "PaymentRecord" ADD COLUMN "stripeInvoice" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "PaymentRecord" ADD COLUMN "stripeInvoiceId" VARCHAR(50);
ALTER TABLE "PaymentRecord" ADD COLUMN "stripeSession" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stripePriceId" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLine_paymentRecordId_productName_key" ON "PaymentLine"("paymentRecordId", "productName");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_pingxxChargeId_key" ON "PaymentRecord"("pingxxChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_stripeInvoiceId_key" ON "PaymentRecord"("stripeInvoiceId");
