-- AlterEnum
ALTER TYPE "UserTokensLogResourceType" ADD VALUE 'PersonaImport';

-- AlterEnum
ALTER TYPE "UserTokensLogVerb" ADD VALUE 'subscriptionReset';

-- AlterTable
ALTER TABLE "UserTokensLog" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- After the migration is applied, update the verb for subscription resets
-- UPDATE "UserTokensLog" SET verb = 'subscriptionReset' WHERE verb = 'subscription' AND "value" < 0;
