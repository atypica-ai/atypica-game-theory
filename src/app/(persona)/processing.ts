import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { parsePDFToText } from "@/ai/reader";
import { initPersonaImportStatReporter } from "@/ai/tools/stats";
import { savePersonaTool } from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { detectInputLanguage } from "@/lib/textUtils";
import { ChatMessageAttachment, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { ModelMessage, UserModelMessage, generateObject, stepCountIs, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { z } from "zod/v3";
import { parseAttachmentPrompt, personaAnalysisPrompt, personaGenerationPrompt } from "./prompt";
import { analysisSchema } from "./types";

export async function processPersonaImport(personaImportId: number) {
  const convertType = ({ attachments, extra, ...personaImport }: PersonaImport) => ({
    ...personaImport,
    attachments: attachments as unknown as ChatMessageAttachment[],
    extra: extra as unknown as PersonaImportExtra,
  });

  let personaImport = await prisma.personaImport
    .findUniqueOrThrow({
      where: { id: personaImportId },
    })
    .then(convertType);

  const shouldResetContext =
    !personaImport.context || !!personaImport.extra.error || !!personaImport.extra.processing;

  personaImport = await prisma.personaImport
    .update({
      where: { id: personaImportId },
      data: {
        ...(shouldResetContext ? { context: "" } : {}),
        analysis: {},
        extra: {
          ...personaImport.extra,
          error: undefined,
          processing: {
            startsAt: Date.now(),
            parseAttachment: shouldResetContext ? false : true,
            buildPersonaPrompt: false,
            analyzeCompleteness: false,
          },
        } as PersonaImportExtra,
      },
    })
    .then(convertType);

  try {
    if (shouldResetContext) {
      const context = await attachmentToContext(personaImport);
      personaImport = await prisma.personaImport
        .update({
          where: { id: personaImport.id },
          data: {
            context,
            extra: {
              ...personaImport.extra,
              processing: { ...personaImport.extra.processing, parseAttachment: true },
            },
          },
        })
        .then(convertType);
    }

    const analysis = await analyzeInterviewCompleteness(personaImport);
    personaImport = await prisma.personaImport
      .update({
        where: { id: personaImport.id },
        data: {
          analysis,
          extra: {
            ...personaImport.extra,
            processing: { ...personaImport.extra.processing, analyzeCompleteness: true },
          },
        },
      })
      .then(convertType);

    await buildPersonaAgentPrompt(personaImport);
    personaImport = await prisma.personaImport
      .update({
        where: { id: personaImport.id },
        data: {
          extra: { ...personaImport.extra, error: undefined, processing: false },
        },
      })
      .then(convertType);
  } catch (error) {
    await prisma.personaImport.update({
      where: { id: personaImportId },
      data: {
        extra: { ...personaImport.extra, error: (error as Error).message, processing: false },
      },
    });
  }
}

async function formatFollowUpChatContent(personaImport: PersonaImport) {
  const followUpChatContent = personaImport.extraUserChatId
    ? (
        await prisma.chatMessage.findMany({
          where: { userChatId: personaImport.extraUserChatId },
          orderBy: { id: "asc" },
        })
      )
        .map(
          ({ role, content }) => `${role === "user" ? "Interviewee" : "Interviewer"}: ${content}`,
        )
        .join("\n")
    : undefined;
  return followUpChatContent;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function ensureBalanceEnough() {
  // TODO
}

async function attachmentToDataUrl(attachment: ChatMessageAttachment) {
  const { objectUrl, mimeType } = attachment;
  const fileHttpUrl = await s3SignedUrl(objectUrl);
  let response: Response;
  if (getDeployRegion() === "mainland" && !/amazonaws\.com\.cn/.test(fileHttpUrl)) {
    response = await proxiedFetch(fileHttpUrl);
  } else {
    response = await fetch(fileHttpUrl);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  const fileBuffer = await response.arrayBuffer();
  const base64Content = Buffer.from(fileBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Content}`;
  return dataUrl;
}

/**
 * 解析 PDF 不消耗 Tokens
 */
async function attachmentToContext(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<string> {
  const attachment = personaImport.attachments[0];
  if (!attachment) {
    throw new Error("No attachment found");
  }
  const { name, objectUrl, mimeType } = attachment;
  if (mimeType !== "application/pdf") {
    throw new Error("Unsupported attachment type");
  }
  const parsedContext = await parsePDFToText({ name, objectUrl, mimeType });

  return parsedContext;
}

/**
 * 这个方法不用了，直接使用 jina 来转换成文本，也不对文本进行预处理，直接使用原文
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function attachmentToContextWithLLM(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<string> {
  const followUpChatContent = await formatFollowUpChatContent(personaImport);

  const locale = await getLocale();
  const logger = rootLogger.child({
    personaImportId: personaImport.id,
    followUpChat: Boolean(followUpChatContent),
  });

  const { statReport } = initPersonaImportStatReporter({
    userId: personaImport.userId,
    personaImportId: personaImport.id,
    logger: logger,
  });

  const attachment = personaImport.attachments[0];
  const { name: fileName, mimeType } = attachment;
  const dataUrl = await attachmentToDataUrl(attachment);

  let parsedContext = "";
  const throttleSaveParsedContext = (() => {
    let timerId: NodeJS.Timeout | null = null;
    return async () => {
      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = null;
          saveNow();
        }, 10000);
      }
      async function saveNow() {
        try {
          await prisma.personaImport.update({
            where: { id: personaImport.id },
            data: { context: parsedContext },
          });
          logger.info("Parsed context saved successfully");
        } catch (error) {
          logger.error(`Error saving parsed context: ${(error as Error).message}`);
        }
      }
    };
  })();

  await new Promise((resolve, reject) => {
    const response = streamText({
      model: llm("gemini-2.5-flash"),
      providerOptions: defaultProviderOptions,

      system: parseAttachmentPrompt({
        locale,
      }),

      messages: [
        {
          role: "user",
          content: [{ type: "file", filename: fileName, data: dataUrl, mediaType: mimeType }],
        },
      ] as UserModelMessage[],

      stopWhen: stepCountIs(1),

      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          parsedContext += chunk.text.toString();
          await throttleSaveParsedContext();
          // logger.info(`Parsed context updated: ${parsedContext.length} characters`);
        }
      },

      onStepFinish: async (step) => {
        const { tokens, extra } = calculateStepTokensUsage(step);
        logger.info({
          msg: "attachmentToContext streamText onStepFinish",
          usage: extra.usage,
          cache: extra.cache,
        });
        if (statReport) {
          await statReport("tokens", tokens, {
            reportedBy: "parse attachment",
            ...extra,
          });
        }
      },

      onFinish: async (result) => {
        logger.info("attachmentToContext completed");
        resolve(null);
        if (result.text) {
          // 使用 createOpenAI 而不是 createOpenAICompatible 时, 这种情况 text 是空的, 应该是个 bug
          parsedContext = result.text;
        }
      },

      onError: ({ error }) => {
        logger.error(`attachmentToContext error: ${(error as Error).message}`);
        reject(error);
      },
    });

    response.consumeStream().catch((error) => reject(error));
  });

  return parsedContext;
}

async function buildPersonaAgentPrompt(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<void> {
  const followUpChatContent = await formatFollowUpChatContent(personaImport);

  // 优先使用文件解析的语言
  const locale = await detectInputLanguage({ text: personaImport.context });

  const logger = rootLogger.child({
    personaImportId: personaImport.id,
    followUpChat: Boolean(followUpChatContent),
  });

  const { statReport } = initPersonaImportStatReporter({
    userId: personaImport.userId,
    personaImportId: personaImport.id,
    logger: logger,
  });

  const personaMessages: ModelMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            locale === "zh-CN"
              ? "以下是经过整理和优化的访谈内容，请基于此内容生成AI人设：\n\n"
              : "Below is the organized and optimized interview content. Please generate AI persona based on this content:\n\n",
        },
        {
          type: "text",
          text: personaImport.context,
        },
        followUpChatContent
          ? {
              type: "text",
              text: `\n\n${locale === "zh-CN" ? "# 与用户的补充访谈" : "# Follow-up interview with the user"}\n\n${followUpChatContent}\n`,
            }
          : { type: "text", text: "[READY]" },
      ],
    },
  ];

  await new Promise((resolve, reject) => {
    const response = streamText({
      model: llm("claude-sonnet-4"),
      providerOptions: defaultProviderOptions,

      system: personaGenerationPrompt({
        locale,
      }),

      messages: personaMessages,

      tools: {
        [ToolName.savePersona]: savePersonaTool({
          personaImportId: personaImport.id,
        }),
      },

      toolChoice: {
        type: "tool",
        toolName: ToolName.savePersona,
      },

      stopWhen: stepCountIs(1),

      onStepFinish: async (step) => {
        const { toolCalls } = step;
        const { tokens, extra } = calculateStepTokensUsage(step);
        logger.info({
          msg: "buildPersonaAgentPrompt streamText onStepFinish",
          usage: extra.usage,
          cache: extra.cache,
          toolCalls: toolCalls.map((call) => call.toolName),
        });
        if (statReport) {
          await statReport("tokens", tokens, {
            reportedBy: "build persona agent",
            ...extra,
          });
        }
      },

      onFinish: async () => {
        logger.info("buildPersonaAgentPrompt completed");
        resolve(null);
      },

      onError: ({ error }) => {
        logger.error(`buildPersonaAgentPrompt error: ${(error as Error).message}`);
        reject(error);
      },
    });

    response.consumeStream().catch((error) => reject(error));
  });
}

async function analyzeInterviewCompleteness(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<z.infer<typeof analysisSchema>> {
  const followUpChatContent = await formatFollowUpChatContent(personaImport);

  // 优先使用文件解析的语言
  const locale = await detectInputLanguage({ text: personaImport.context });

  const logger = rootLogger.child({
    personaImportId: personaImport.id,
    followUpChat: Boolean(followUpChatContent),
  });

  const { statReport } = initPersonaImportStatReporter({
    userId: personaImport.userId,
    personaImportId: personaImport.id,
    logger: logger,
  });

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            locale === "zh-CN"
              ? "以下是经过整理和优化的访谈内容，请基于此内容进行分析：\n\n"
              : "Below is the organized and optimized interview content. Please analyze based on this content:\n\n",
        },
        {
          type: "text",
          text: personaImport.context,
        },
        followUpChatContent
          ? {
              type: "text",
              text: `\n\n${locale === "zh-CN" ? "# 与用户的补充访谈" : "# Follow-up interview with the user"}\n\n${followUpChatContent}\n`,
            }
          : { type: "text", text: "[READY]" },
      ],
    },
  ];

  let analysisResult: z.infer<typeof analysisSchema>;

  try {
    const result = await generateObject({
      // model: llm("gemini-2.5-pro"),
      model: llm("gpt-5"),
      experimental_repairText: async (options) => {
        console.log(options);
        return options.text;
      },
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "minimal",
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: personaAnalysisPrompt({ locale }),
      schema: analysisSchema,
      messages: messages,
    });
    logger.info({
      msg: "analyzeInterviewCompleteness generateObject finish",
      usage: result.usage,
    });
    if (statReport) {
      const { tokens, extra } = calculateStepTokensUsage(result);
      await statReport("tokens", tokens, {
        reportedBy: "analyze interview completeness",
        ...extra,
      });
    }
    analysisResult = result.object;
  } catch (error) {
    logger.error(`analyzeInterviewCompleteness error: ${(error as Error).message}`);
    throw error;
  }

  return analysisResult;
}
