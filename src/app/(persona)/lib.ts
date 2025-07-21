import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { rootLogger } from "@/lib/logging";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";

export async function createPersonaWithPostProcess({
  name,
  source,
  tags,
  prompt,
  locale,
  scoutUserChatId,
  personaImportId,
}: {
  name: string;
  source: string;
  tags: string[];
  // samples?: string[];
  prompt: string;
  locale?: Locale;
  scoutUserChatId?: number;
  personaImportId?: number;
}) {
  const persona = await prisma.persona.create({
    data: {
      name,
      source,
      tags,
      samples: [],
      prompt,
      locale,
      scoutUserChatId,
      personaImportId,
    },
  });
  waitUntil(createPersonaEmbedding(persona));
  return persona;
}

async function createPersonaEmbedding(persona: Persona) {
  try {
    // const text = persona.name + " " + (persona.tags as string[])?.join(" ");
    const text = persona.prompt; // 使用 prompt 进行更精确的搜索
    const embedding = await createTextEmbedding(text, "retrieval.passage");
    await prisma.$executeRaw`
      UPDATE "Persona"
      SET "embedding" = ${JSON.stringify(embedding)}::vector
      WHERE "id" = ${persona.id}
    `;
    rootLogger.info(`Updated semantic embedding for persona ${persona.id}`);
  } catch (error) {
    rootLogger.error(
      `Failed to update semantic embedding for persona ${persona.id}: ${(error as Error).message}`,
    );
  }
}
