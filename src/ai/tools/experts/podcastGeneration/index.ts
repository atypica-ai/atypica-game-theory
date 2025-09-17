import "server-only";

import { podcastScriptSystem } from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { fixMalformedUnicodeString, generateToken } from "@/lib/utils";
import { Analyst, AnalystPodcast, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { FinishReason, Message, streamText, tool } from "ai";
import { z } from "zod";
import { type GeneratePodcastResult } from "./types";

export const generatePodcastTool = ({
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Generate an engaging podcast script based on the completed study findings and interview data.",
    parameters: z.object({
      instruction: z
        .string()
        .describe(
          "Detailed podcast style and content instructions. Specify the tone, pacing, target audience, and any special requirements for the podcast script."
        )
        .transform(fixMalformedUnicodeString),
      podcastToken: z
        .string()
        .optional()
        .describe(
          "Podcast token used to create records. You don't need to provide this - the system will automatically generate it"
        )
        .transform(() => generateToken()),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({
      instruction,
      podcastToken,
    }): Promise<GeneratePodcastResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            include: {
              interviews: {
                where: { conclusion: { not: "" } },
              },
            },
          },
        },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      const podcastLogger = logger.child({ analystId, podcastToken });
      
      let podcast = await prisma.analystPodcast.findFirst({
        where: { analystId },
        orderBy: { createdAt: "desc" },
      });
      
      let hint = "";
      if (podcast && !podcast.generatedAt) {
        // Reuse this incomplete podcast record and override token
        hint = `Continuing from previous incomplete podcast (${podcast.token}).`;
        podcast = await prisma.analystPodcast.update({
          where: { id: podcast.id },
          data: { token: podcastToken, instruction },
        });
      } else {
        podcast = await prisma.analystPodcast.create({
          data: { analystId, instruction, token: podcastToken, script: "" },
        });
      }

      // Generate Podcast Script
      try {
        await generatePodcastScript({
          analyst,
          podcast,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: podcastLogger,
        });
        // Update podcast data
        podcast = await prisma.analystPodcast.findUniqueOrThrow({
          where: { id: podcast.id },
        });
      } catch (error) {
        podcastLogger.error(`Error generating podcast for analyst ${analystId}: ${error}`);
        throw error;
      }

      return {
        podcastToken: podcast.token,
        plainText: `Podcast script successfully generated. ${hint}`,
      };
    },
  });

export async function generatePodcastScript({
  analyst,
  podcast,
  instruction,
  locale,
  abortSignal,
  statReport,
  logger,
  systemPrompt,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  podcast: AnalystPodcast;
  instruction: string;
  systemPrompt?: string;
} & AgentToolConfigArgs) {
  logger.info({ msg: "generatePodcastScript", analystId: analyst.id, podcastId: podcast.id });
  let script = podcast.script; // If podcast has content, continue from existing script

  const throttleSaveScript = (() => {
    let timerId: NodeJS.Timeout | null = null;

    return async (
      podcastId: number,
      script: string,
      { immediate }: { immediate?: boolean } = {},
    ) => {
      if (immediate) {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        saveNow();
        return;
      }

      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = null;
          saveNow();
        }, 5000); // 5 second throttle
      }

      async function saveNow() {
        try {
          await prisma.analystPodcast.update({
            where: { id: podcastId },
            data: { script },
          });
          logger.info("Podcast script persisted successfully");
        } catch (error) {
          logger.error(`Error persisting podcast script: ${(error as Error).message}`);
        }
      }
    };
  })();

  let modelName: LLMModelName = "claude-sonnet-4";
  
  const streamTextPromise = new Promise<{
    finishReason: FinishReason | "Too many tokens";
    content: string;
  }>(async (resolve, reject) => {
    const experimental_attachments = analyst.attachments
      ? await Promise.all(
          (analyst.attachments as ChatMessageAttachment[]).map(
            async ({ name, objectUrl, mimeType }) => {
              const url = await fileUrlToDataUrl({ objectUrl, mimeType });
              return { name, url, contentType: mimeType };
            },
          ),
        )
      : undefined;

    // Create podcast script prompt content
    const podcastContent = `# Podcast Script Generation Request

<Research Topic>
${analyst.topic}
</Research Topic>

<Research Brief>
${analyst.brief}
</Research Brief>

<Study Summary>
${analyst.studySummary}
</Study Summary>

<Research Process>
${analyst.studyLog}
</Research Process>

<Interviews>
${analyst.interviews.map((interview, index) => `
### Interview ${index + 1}
${interview.conclusion}
`).join('\n')}
</Interviews>

Please generate a comprehensive, engaging podcast script based on the above research findings. The script should be conversational, well-structured, and optimized for audio delivery.`;

    const messages: Omit<Message, "id">[] = [
      {
        role: "user",
        content: podcastContent,
        experimental_attachments,
      },
    ];

    if (script) {
      messages.push({ role: "assistant", content: script });
      messages.push({
        role: "user",
        content: "Please continue with the remaining podcast script content without repeating what's already been generated.",
      });
    }

    const response = streamText({
      model: llm(modelName),
      providerOptions: providerOptions,
      system: systemPrompt
        ? systemPrompt
        : podcastScriptSystem({
            locale,
            analystKind: (analyst.kind as AnalystKind) || AnalystKind.misc,
          }),
      messages: messages,
      maxSteps: 1,
      maxTokens: 30000,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          script += chunk.textDelta.toString();
          await throttleSaveScript(podcast.id, script);
        }
      },
      onFinish: async ({ finishReason, text, usage }) => {
        resolve({
          finishReason: finishReason,
          content: text,
        });
        logger.info({ msg: "generatePodcastScript streamText onFinish", finishReason, usage });
        const totalTokens =
          (usage.completionTokens ?? 0) * 3 + (usage.promptTokens ?? 0) || usage.totalTokens;
        if (totalTokens > 0 && statReport) {
          await statReport("tokens", totalTokens, {
            reportedBy: "generatePodcast tool",
            part: "script",
            usage,
          });
        }
      },
      onError: ({ error }) => {
        const msg = (error as Error).message;
        if (msg.includes("Too many tokens")) {
          logger.warn(`Podcast generation hit token limit: ${msg}`);
          setTimeout(
            () => resolve({ finishReason: "Too many tokens", content: "" }),
            Math.floor(Math.random() * (120_000 - 60_000 + 1)) + 60_000,
          );
        } else if ((error as Error).name === "AbortError") {
          logger.warn(`generatePodcastScript streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`generatePodcastScript streamText onError: ${msg}`);
          reject(error);
        }
      },
      abortSignal,
    });

    abortSignal.addEventListener("abort", () => {
      reject(new Error("generatePodcastScript abortSignal received"));
    });

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const { finishReason } = await streamTextPromise;
  // Save final script
  await throttleSaveScript(podcast.id, script, { immediate: true });

  if (finishReason === "length") {
    logger.warn("Podcast script generation hit length limit but completed");
  }

  await prisma.analystPodcast.update({
    where: { id: podcast.id },
    data: { generatedAt: new Date() },
  });
} 