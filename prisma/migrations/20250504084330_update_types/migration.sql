-- AlterEnum
ALTER TYPE "UserChatKind" ADD VALUE 'interviewSession';

-- AlterTable
ALTER TABLE "InvitationCode" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "VerificationCode" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6);
