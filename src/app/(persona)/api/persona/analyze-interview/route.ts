import { llm } from "@/ai/provider";
import { personaAnalysisPrompt } from "@/app/(persona)/prompts";
import { analysisSchema } from "@/app/(persona)/types";
import { streamObject } from "ai";

export async function POST(req: Request) {
  const { fileUrl, fileName, mimeType } = await req.json();

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
    abortSignal: req.signal,
  });

  return result.toTextStreamResponse();
}
