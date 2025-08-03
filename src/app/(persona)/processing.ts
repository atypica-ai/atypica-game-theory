import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { initPersonaImportStatReporter } from "@/ai/tools/stats";
import { savePersonaTool } from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { ChatMessageAttachment, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { CoreMessage, generateObject, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { personaAnalysisPrompt, personaGenerationPrompt } from "./prompt";
import { analysisSchema } from "./types";

export async function processPersonaImport(personaImportId: number) {
  const personaImport = await prisma.personaImport
    .findUniqueOrThrow({
      where: { id: personaImportId },
    })
    .then(({ attachments, extra, ...personaImport }) => ({
      ...personaImport,
      attachments: attachments as unknown as ChatMessageAttachment[],
      extra: extra as unknown as PersonaImportExtra,
    }));

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

  const extra = {
    ...personaImport.extra,
    error: undefined,
    processing: true,
  };

  await prisma.personaImport.update({
    where: { id: personaImportId },
    data: {
      analysis: {},
      extra: extra,
    },
  });

  await Promise.all([
    buildPersonaAgentPrompt(personaImport, followUpChatContent),
    analyzeInterviewCompleteness(personaImport, followUpChatContent),
  ])
    .catch(async (error) => {
      await prisma.personaImport.update({
        where: { id: personaImportId },
        data: { extra: { ...extra, error: error.message, processing: false } },
      });
    })
    .finally(async () => {
      await prisma.personaImport.update({
        where: { id: personaImportId },
        data: { extra: { ...extra, processing: false } },
      });
    });
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

async function buildPersonaAgentPrompt(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
  followUpChatContent?: string,
): Promise<void> {
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

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);
    const personaMessages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "file", filename: fileName, data: dataUrl, mimeType },
          followUpChatContent
            ? {
                type: "text",
                text: `\n# follow-up interview with the user\n\n${followUpChatContent}\n`,
              }
            : { type: "text", text: "[READY]" },
        ],
      },
    ];

    const response = streamText({
      model: llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
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
      maxSteps: 1,
      onStepFinish: async (step) => {
        const { usage, stepType, toolCalls } = step;
        logger.info({
          msg: "buildPersonaAgentPrompt streamText onStepFinish",
          stepType,
          usage,
          toolCalls: toolCalls.map((call) => call.toolName),
        });
        if (usage.totalTokens > 0) {
          const tokens = usage.totalTokens;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra: any = {
            reportedBy: "build persona agent",
            usage,
          };
          await statReport("tokens", tokens, extra);
        }
      },
      onError: ({ error }) => {
        logger.error((error as Error).message);
      },
    });

    await response.consumeStream();

    logger.info("buildPersonaAgentPrompt completed");
  } catch (error) {
    logger.error(`buildPersonaAgentPrompt error: ${(error as Error).message}`);
    throw error;
  }
}

async function analyzeInterviewCompleteness(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
  followUpChatContent?: string,
): Promise<void> {
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

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "file", filename: fileName, data: dataUrl, mimeType },
          followUpChatContent
            ? {
                type: "text",
                text: `\n# follow-up interview with the user\n\n${followUpChatContent}\n`,
              }
            : { type: "text", text: "[READY]" },
        ],
      },
    ];

    const result = await generateObject({
      model: llm("gemini-2.5-pro"),
      system: personaAnalysisPrompt({ locale }),
      schema: analysisSchema,
      messages: messages,
    });

    // Update PersonaImport with the analysis results
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: { analysis: result.object },
    });

    {
      const { usage } = result;
      logger.info({
        msg: "analyzeInterviewCompleteness generateObject finish",
        usage,
      });
      if (usage.totalTokens > 0) {
        const tokens = usage.totalTokens;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extra: any = {
          reportedBy: "analyze interview completeness",
          usage,
        };
        await statReport("tokens", tokens, extra);
      }
    }
  } catch (error) {
    logger.error(`analyzeInterviewCompleteness error: ${(error as Error).message}`);
    throw error;
  }
}
