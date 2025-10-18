import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject, UserModelMessage } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { personaScoringPrompt } from "./prompt";
import { personaScoringSchema, PersonaTier } from "./types";

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
  const data = {
    name,
    source,
    tags,
    samples: [],
    prompt,
    locale,
    scoutUserChatId,
    personaImportId,
  };
  let persona: Persona | null = null;
  // 通过 personaImport 导入的 persona，只创建一个，只更新不重新创建
  if (personaImportId) {
    persona = await prisma.persona.findFirst({
      where: { personaImportId },
      orderBy: { id: "desc" },
    });
  }
  if (persona) {
    persona = await prisma.persona.update({
      where: { id: persona.id },
      data: data,
    });
  } else {
    persona = await prisma.persona.create({
      data: {
        ...data,
        token: generateToken(),
      },
    });
  }

  // 只调用 scorePersona，如果 tier > 0，再计算 embedding，否则清空 embedding
  await scorePersona(persona);
  // await Promise.all([createPersonaEmbedding(persona), scorePersona(persona)]);

  return persona;
}

async function createPersonaEmbedding(persona: Persona) {
  try {
    // const text = persona.name + " " + (persona.tags as string[])?.join(" ");
    const text = persona.prompt; // 使用 prompt 进行更精确的搜索
    const embedding = await createTextEmbedding(text, "retrieval.passage");
    await prisma.$executeRaw`
      UPDATE "Persona"
      SET "embedding" = ${JSON.stringify(embedding)}::halfvec
      WHERE "id" = ${persona.id}
    `;
    rootLogger.info(`Updated semantic embedding for persona ${persona.id}`);
  } catch (error) {
    rootLogger.error(
      `Failed to update semantic embedding for persona ${persona.id}: ${(error as Error).message}`,
    );
  }
}

async function clearPersonaEmbedding(persona: Persona) {
  try {
    await prisma.$executeRaw`
      UPDATE "Persona"
      SET "embedding" = NULL
      WHERE "id" = ${persona.id}
    `;
    rootLogger.info(`Cleared semantic embedding for persona ${persona.id}`);
  } catch (error) {
    rootLogger.error(
      `Failed to clear semantic embedding for persona ${persona.id}: ${(error as Error).message}`,
    );
  }
}

export async function scorePersona(persona: Persona) {
  try {
    if (persona.personaImportId) {
      await prisma.persona.update({
        where: { id: persona.id },
        data: { tier: PersonaTier.Tier3 },
      });
      rootLogger.info(
        `Persona ${persona.id} scored with tier ${PersonaTier.Tier3} due to personaImportId.`,
      );
      return;
    }

    const locale = (persona.locale as Locale) ?? (await getLocale());
    const result = await generateObject({
      model: llm("gpt-4.1-mini"),
      providerOptions: defaultProviderOptions,
      system: personaScoringPrompt({ locale }),
      schema: personaScoringSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Prompt: ${persona.prompt}\n\nTags: ${(persona.tags as string[]).join(", ")}`,
            },
          ],
        },
      ] as UserModelMessage[],
    });

    const totalScore =
      result.object.demographic +
      result.object.geographic +
      result.object.psychological +
      result.object.behavioral +
      result.object.needsPainPoints +
      result.object.techAcceptance +
      result.object.socialRelations;
    const tier =
      totalScore >= 6
        ? PersonaTier.Tier2 // 接近真人，更高级的智能体
        : totalScore >= 4
          ? PersonaTier.Tier1 // 超出平均，高质量的合成智能体
          : PersonaTier.Tier0;

    persona = await prisma.persona.update({
      where: { id: persona.id },
      data: { tier: tier },
    });

    if (tier === PersonaTier.Tier0) {
      await clearPersonaEmbedding(persona);
    } else {
      await createPersonaEmbedding(persona);
    }

    rootLogger.info(
      `Persona ${persona.id} scored with tier ${tier}. ${JSON.stringify(result.object)}`,
    );
  } catch (error) {
    rootLogger.error(`Failed to score persona ${persona.id}: ${(error as Error).message}`);
  }
}
