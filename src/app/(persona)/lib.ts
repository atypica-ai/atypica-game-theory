import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { llm, providerOptions } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { personaScoringPrompt } from "./prompt";
import { personaScoringSchema } from "./types";

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
  await Promise.all([createPersonaEmbedding(persona), scorePersona(persona)]);

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

export async function scorePersona(persona: Persona) {
  try {
    if (persona.personaImportId) {
      await prisma.persona.update({
        where: { id: persona.id },
        data: { tier: 2 },
      });
      rootLogger.info(`Persona ${persona.id} scored with tier 2 due to personaImportId.`);
      return;
    }

    const locale = (persona.locale as Locale) ?? (await getLocale());
    const result = await generateObject({
      model: llm("gpt-4.1-mini"),
      providerOptions,
      system: personaScoringPrompt({ locale }),
      schema: personaScoringSchema,
      messages: [
        {
          role: "user",
          content: `Prompt: ${persona.prompt}\n\nTags: ${(persona.tags as string[]).join(", ")}`,
        },
      ],
    });

    const { demographic, psychological, behavioralEconomics, politicalCognition } = result.object;
    const totalScore = demographic + psychological + behavioralEconomics + politicalCognition;
    const tier = totalScore >= 4 ? 1 : 0;

    await prisma.persona.update({
      where: { id: persona.id },
      data: { tier: tier },
    });
    rootLogger.info(
      `Persona ${persona.id} scored with tier ${tier}. ${JSON.stringify(result.object)}`,
    );
  } catch (error) {
    rootLogger.error(`Failed to score persona ${persona.id}: ${(error as Error).message}`);
  }
}
