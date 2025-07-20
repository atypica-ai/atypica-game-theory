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
import { CoreMessage, generateObject, generateText, streamText } from "ai";
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

// Build persona summary from PDF
export async function buildPersonaSummary(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<void> {
  const locale = await getLocale();

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    // Step 1: Generate summary using personaGenerationPrompt with summary mode
    const summarySystemPrompt = personaGenerationPrompt({ locale, mode: "summary" });

    const summaryResult = await generateText({
      model: llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
      system: summarySystemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "[READY]" },
            { type: "file", filename: fileName, data: dataUrl, mimeType },
          ],
        },
      ],
    });

    // Update PersonaImport with the generated summary
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: { summary: summaryResult.text },
    });

    // Step 2: Generate single persona using savePersona tool
    const personaSystemPrompt = personaGenerationPrompt({ locale, mode: "persona" });

    const personaMessages: CoreMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "[READY]" },
          { type: "file", filename: fileName, data: dataUrl, mimeType },
        ],
      },
      {
        role: "assistant",
        content: summaryResult.text,
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
      maxSteps: 2,
      onStepFinish: async (step) => {
        // console.log(step);
      },
      onError: ({ error }) => {
        rootLogger.error((error as Error).message);
      },
    });

    await response
      .consumeStream()
      .then(() => {})
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    console.error("Error building persona summary:", error);
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

// Analyze interview completeness from PDF
export async function analyzeInterviewCompleteness(
  personaImport: Omit<PersonaImport, "attachments"> & {
    attachments: ChatMessageAttachment[];
  },
): Promise<void> {
  const locale = await getLocale();

  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    const result = await generateObject({
      model: llm("gemini-2.5-flash"),
      system: personaAnalysisPrompt({ locale }),
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "请分析以下PDF文件内容" },
            { type: "file", filename: fileName, data: dataUrl, mimeType },
          ],
        },
      ],
    });

    // Update PersonaImport with the analysis results
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: { analysis: result.object },
    });
  } catch (error) {
    console.error("Error analyzing interview:", error);
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
