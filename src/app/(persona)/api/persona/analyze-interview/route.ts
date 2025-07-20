import { llm } from "@/ai/provider";
import { streamObject } from "ai";
import { interviewAnalysisPrompt } from "../../../prompts";
import { analysisSchema } from "../../../types";

export async function POST(req: Request) {
  const { interviewRecord } = await req.json();

  if (!interviewRecord) {
    return new Response(JSON.stringify({ error: "interviewRecord is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = interviewAnalysisPrompt(interviewRecord);

  const result = streamObject({
    model: llm("gemini-2.5-flash"),
    schema: analysisSchema,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    abortSignal: req.signal,
  });

  return result.toTextStreamResponse();
}
