-- AlterTable
ALTER TABLE "User" ADD COLUMN     "personalUserId" INTEGER,
ADD COLUMN     "teamIdAsMember" INTEGER,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "seats" INTEGER NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamIdAsMember_fkey" FOREIGN KEY ("teamIdAsMember") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personalUserId_fkey" FOREIGN KEY ("personalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
