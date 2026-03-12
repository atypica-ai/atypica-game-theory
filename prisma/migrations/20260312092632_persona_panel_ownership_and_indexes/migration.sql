-- DropForeignKey
ALTER TABLE "AnalystInterview" DROP CONSTRAINT "AnalystInterview_personaPanelId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionTimeline" DROP CONSTRAINT "DiscussionTimeline_personaPanelId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLine" DROP CONSTRAINT "PaymentLine_paymentRecordId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_paymentRecordId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "TokensAccount" DROP CONSTRAINT "TokensAccount_activeSubscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "TokensAccount" DROP CONSTRAINT "TokensAccount_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TokensAccount" DROP CONSTRAINT "TokensAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "TokensLog" DROP CONSTRAINT "TokensLog_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TokensLog" DROP CONSTRAINT "TokensLog_userId_fkey";

-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "teamId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "PersonaPanel" ADD COLUMN     "teamId" INTEGER,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Persona_userId_idx" ON "Persona"("userId");

-- AddForeignKey
ALTER TABLE "PaymentLine" ADD CONSTRAINT "PaymentLine_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_activeSubscriptionId_fkey" FOREIGN KEY ("activeSubscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaPanel" ADD CONSTRAINT "PersonaPanel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaPanel" ADD CONSTRAINT "PersonaPanel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionTimeline" ADD CONSTRAINT "DiscussionTimeline_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
