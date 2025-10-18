/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `Persona` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "token" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_token_key" ON "Persona"("token");
