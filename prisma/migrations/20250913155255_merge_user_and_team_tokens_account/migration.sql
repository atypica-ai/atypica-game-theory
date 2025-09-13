-- Step 1: Rename UserTokens to TokensAccount
ALTER TABLE "UserTokens" RENAME TO "TokensAccount";

-- Step 2: Rename primary key constraint
ALTER TABLE "TokensAccount" RENAME CONSTRAINT "UserTokens_pkey" TO "TokensAccount_pkey";

-- Step 3: Rename unique index
ALTER INDEX "UserTokens_userId_key" RENAME TO "TokensAccount_userId_key";

-- Step 4: Add new columns to TokensAccount (for team support)
ALTER TABLE "TokensAccount" ADD COLUMN "teamId" INTEGER;

-- Step 5: Make userId nullable in TokensAccount
ALTER TABLE "TokensAccount" ALTER COLUMN "userId" DROP NOT NULL;

-- Step 6: Update foreign key constraints
-- Drop old foreign key constraint
ALTER TABLE "TokensAccount" DROP CONSTRAINT "UserTokens_userId_fkey";

-- Add new foreign key constraints
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Create unique index for teamId
CREATE UNIQUE INDEX "TokensAccount_teamId_key" ON "TokensAccount"("teamId");
