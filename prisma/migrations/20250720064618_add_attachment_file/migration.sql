-- CreateTable
CREATE TABLE "AttachmentFile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AttachmentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentFile_objectUrl_key" ON "AttachmentFile"("objectUrl");

-- AddForeignKey
ALTER TABLE "AttachmentFile" ADD CONSTRAINT "AttachmentFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
