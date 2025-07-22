-- CreateTable
CREATE TABLE "UserPersonaChatRelation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "personaId" INTEGER NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserPersonaChatRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaChatRelation_userChatId_key" ON "UserPersonaChatRelation"("userChatId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaChatRelation_userId_personaId_key" ON "UserPersonaChatRelation"("userId", "personaId");

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_extraUserChatId_fkey" FOREIGN KEY ("extraUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
