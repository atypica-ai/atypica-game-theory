import { llm } from "@/ai/provider";
import {
  updatePersonaImportAnalysis,
  updatePersonaImportExtra,
} from "@/app/(persona)/persona-import/actions";
import { personaAnalysisPrompt } from "@/app/(persona)/prompts";
import { analysisSchema } from "@/app/(persona)/types";
import { streamObject } from "ai";

export async function POST(req: Request) {
  const { fileUrl, fileName, mimeType, personaImportId } = await req.json();

  if (!fileUrl || !fileName) {
    return new Response(JSON.stringify({ error: "fileUrl and fileName are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the PDF file
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch PDF file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Content = Buffer.from(fileBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Content}`;

  const result = streamObject({
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
    onFinish: async ({ object }) => {
      // Update PersonaImport with the analysis results
      if (personaImportId && object) {
        try {
          await updatePersonaImportAnalysis(parseInt(personaImportId), object);
        } catch (error) {
          console.error("Error updating PersonaImport with analysis:", error);
        }
      }
    },
    onError: async ({ error }) => {
      // Update PersonaImport with error in extra field
      if (personaImportId) {
        updatePersonaImportExtra(parseInt(personaImportId), {
          error: (error as Error).message,
        }).catch(console.error);
      }
    },
    abortSignal: req.signal,
  });

  return result.toTextStreamResponse();
}
