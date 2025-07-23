-- DropForeignKey
ALTER TABLE "PersonaImport" DROP CONSTRAINT "PersonaImport_userId_fkey";

-- CreateTable
CREATE TABLE "InterviewProject" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "brief" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userChatId" INTEGER,
    "intervieweeUserId" INTEGER,
    "intervieweePersonaId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewProject_token_key" ON "InterviewProject"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_userChatId_key" ON "InterviewSession"("userChatId");

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewProject" ADD CONSTRAINT "InterviewProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_intervieweeUserId_fkey" FOREIGN KEY ("intervieweeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_intervieweePersonaId_fkey" FOREIGN KEY ("intervieweePersonaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
