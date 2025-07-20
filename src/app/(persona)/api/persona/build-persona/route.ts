import { llm, providerOptions } from "@/ai/provider";
import { personaGenerationPrompt } from "@/app/(persona)/prompts";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { data } = await req.json();
  const { fileUrl, fileName, mimeType } = data || {};

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

  const prompt = personaGenerationPrompt({ locale: "zh-CN" });

  const result = streamText({
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
    onError: ({ error }) => {
      console.log("Error:", error);
    },
    abortSignal: req.signal,
  });

  return result.toDataStreamResponse();
}
