import { llm, providerOptions } from "@/ai/provider";
import { personaInterviewProcessorPrompt } from "@/app/(persona)/prompts";
import { processSchema } from "@/app/(persona)/types";
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
    providerOptions: providerOptions,
    system: personaInterviewProcessorPrompt,
    schema: processSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Please process the following PDF file" },
          { type: "file", data: dataUrl, mimeType },
        ],
      },
    ],
    abortSignal: req.signal,
  });

  return result.toTextStreamResponse();
}
