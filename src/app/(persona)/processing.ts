import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { ChatMessageAttachment, PersonaImport } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject, generateText } from "ai";
import { personaAnalysisPrompt, personaGenerationPrompt } from "./prompts";
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
  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);
    const prompt = personaGenerationPrompt({ locale: "zh-CN" });

    const result = await generateText({
      model: llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
      system: prompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请基于以下PDF文件内容生成一个详细的人格画像总结和系统提示词。文件名：${fileName}`,
            },
            { type: "file", filename: fileName, data: dataUrl, mimeType },
          ],
        },
      ],
    });

    // Update PersonaImport with the generated summary
    await prisma.personaImport.update({
      where: { id: personaImport.id },
      data: { summary: result.text },
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
  try {
    const attachment = personaImport.attachments[0];
    const { name: fileName, mimeType } = attachment;
    const dataUrl = await attachmentToDataUrl(attachment);

    const result = await generateObject({
      model: llm("gemini-2.5-flash"),
      system: personaAnalysisPrompt(),
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
