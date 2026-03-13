import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { reasoningPrologue, reasoningSystem } from "@/ai/tools/experts/reasoningThinking/prompt";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";

import { calculateStepTokensUsage } from "@/ai/usage";
import { prismaRO } from "@/prisma/prisma";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { google } from "@ai-sdk/google";
import { streamText, tool, UserModelMessage } from "ai";
import { Locale } from "next-intl";
import {
  audienceCallInputSchema,
  audienceCallOutputSchema,
  type AudienceCallResult,
} from "./types";

// Updated type to include prompt field
type TPersonaForStudy = {
  personaId: number;
  name: string;
  tags: string[];
  source: string;
  prompt: string;
};

async function audienceCall({
  locale,
  background,
  question,
  personas,
  abortSignal,
  statReport,
  logger,
}: {
  background: string;
  question: string;
  personas: TPersonaForStudy[];
} & AgentToolConfigArgs): Promise<AudienceCallResult> {
  return new Promise(async (resolve, reject) => {
    // Use the first persona's prompt as the system prompt, or fallback to default
    const systemPrompt = personas.length > 0 ? personas[0].prompt : reasoningSystem({ locale });
    const response = streamText({
      // model: llm("o3-mini"),
      model: llm("gemini-3.1-pro"),
      providerOptions: defaultProviderOptions(),
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
        }),
      },
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: reasoningPrologue({ locale, background, question }),
            },
          ],
        },
      ] as UserModelMessage[],
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async (result) => {
        logger.info("audienceCall streamText onFinish");
        const text = result.text ?? "";
        if (statReport) {
          const { tokens, extra } = calculateStepTokensUsage(result);
          await statReport("tokens", tokens, {
            reportedBy: "audienceCall tool",
            ...extra,
          });
        }
        resolve({
          reasoning: result.reasoningText ?? "",
          plainText: text,
        });
      },
      onError: ({ error }) => {
        logger.error(`audienceCall streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response.consumeStream();
  });
}

export const audienceCallTool = (toolCallConfigArgs: AgentToolConfigArgs) =>
  tool({
    description:
      "Search for relevant user personas and get expert consultation with persona-informed analysis for complex problems or decisions. Provides detailed thinking process and professional insights based on specific user personas found in the database.",
    inputSchema: audienceCallInputSchema,
    outputSchema: audienceCallOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async (
      { background, question, audienceSearchQueries },
      {
        // 第二个参数有 messages 等数据
        // messages
      },
    ) => {
      const searchResults = await Promise.all(
        audienceSearchQueries.map((searchQuery) =>
          searchPersonas(toolCallConfigArgs.locale, searchQuery),
        ),
      );
      let personas: TPersonaForStudy[] = [];
      const seenPersonaIds = new Set<number>();
      const maxPersonaLength = Math.max(...searchResults.map((result) => result.personas.length));
      for (let i = 0; i < maxPersonaLength; i++) {
        searchResults.forEach((result) => {
          if (i >= result.personas.length) {
            return;
          }
          const persona = result.personas[i];
          if (!seenPersonaIds.has(persona.personaId)) {
            personas.push(persona);
            seenPersonaIds.add(persona.personaId);
          }
        });
      }
      personas = personas.slice(0, 10);

      if (toolCallConfigArgs.statReport) {
        await toolCallConfigArgs.statReport("personas", personas.length, {
          reportedBy: "audienceCall tool",
          personaIds: personas.map((persona) => persona.personaId),
        });
      }

      const result = await audienceCall({
        background,
        question,
        personas,
        ...toolCallConfigArgs,
      });

      // // Include persona information in the result
      // const personasSummary = personas.length > 0
      //   ? `\n\nFound ${personas.length} relevant personas: ${personas.map(p => p.name).join(', ')}`
      //   : "\n\nNo relevant personas found in database.";

      return result;
    },
  });

async function searchPersonas(locale: Locale, searchQuery: string) {
  // Use Meilisearch for full-text search
  const searchResults = await searchPersonasFromMeili({
    query: searchQuery,
    locales: [locale],
    pageSize: 5,
  });

  // Extract persona IDs from slugs
  const personaIds = searchResults.hits
    .map((hit) => {
      const match = hit.slug.match(/^persona-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);

  if (personaIds.length === 0) {
    return { searchQuery, personas: [] };
  }

  // Query database for full persona data
  const personas = await prismaRO.persona
    .findMany({
      where: { id: { in: personaIds } },
      select: {
        id: true,
        name: true,
        source: true,
        tags: true,
        prompt: true,
      },
    })
    .then((results) =>
      results.map((p) => ({
        personaId: p.id,
        name: p.name,
        source: p.source,
        tags: p.tags as string[],
        prompt: p.prompt,
      })),
    );

  // Maintain Meilisearch order
  const personaMap = new Map(personas.map((p) => [p.personaId, p]));
  const orderedPersonas = personaIds
    .map((id) => personaMap.get(id))
    .filter(Boolean) as TPersonaForStudy[];

  return { searchQuery, personas: orderedPersonas };
}
