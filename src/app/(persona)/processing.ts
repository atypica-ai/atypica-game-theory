import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { savePersonaTool } from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { ChatMessageAttachment, PersonaImport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { CoreMessage, generateObject, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { personaAnalysisPrompt, personaGenerationPrompt } from "./prompt";
import { analysisSchema } from "./types";

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

export async function buildPersonaAgentPrompt(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<void> {
  const locale = await getLocale();
  const logger = rootLogger.child({ personaImportId: personaImport.id });

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    const personaSystemPrompt = personaGenerationPrompt({ locale });

    const personaMessages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "[READY]" },
          { type: "file", filename: fileName, data: dataUrl, mimeType },
        ],
      },
    ];

    const response = streamText({
      model: llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
      system: personaSystemPrompt,
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
      // onStepFinish: async (step) => {
      //   console.log(step);
      // },
      onError: ({ error }) => {
        logger.error((error as Error).message);
      },
    });

    await response.consumeStream();

    logger.info("buildPersonaAgentPrompt completed");
  } catch (error) {
    logger.error(`buildPersonaAgentPrompt error: ${(error as Error).message}`);
    // Update PersonaImport with error in extra field
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: {
        extra: {
          error: (error as Error).message,
        },
      },
    });
  }
}

export async function analyzeInterviewCompleteness(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<void> {
  const locale = await getLocale();
  const logger = rootLogger.child({ personaImportId: personaImport.id });

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "[READY]" },
          { type: "file", filename: fileName, data: dataUrl, mimeType },
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

    logger.info(`analyzeInterviewCompleteness completed`);
  } catch (error) {
    logger.error(`analyzeInterviewCompleteness error: ${(error as Error).message}`);
    // Update PersonaImport with error in extra field
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: {
        extra: {
          error: (error as Error).message,
        },
      },
    });
  }
}
