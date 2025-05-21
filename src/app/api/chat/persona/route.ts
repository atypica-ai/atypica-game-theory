import { llm, providerOptions } from "@/ai/llm";
import { personaAgentSystem } from "@/ai/prompt";
import { dySearchTool, insSearchTool, tiktokSearchTool, ToolName } from "@/ai/tools";
import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { authOptions } from "@/lib/auth";
import { Message, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 需要登录，但是没有其他特别权限
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const personaId = parseInt(payload["id"]);
  const messages = payload["messages"] as Message[];
  if (!personaId || !messages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await fetchPersonaById(personaId);
  if (!result.success) {
    notFound();
  }
  const persona = result.data;

  const streamTextResult = streamText({
    // model: llm("claude-3-7-sonnet"),
    // model: llm("qwen3-235b-a22b"),
    model: llm("gemini-2.5-flash", {
      //
    }),
    providerOptions: providerOptions,
    tools: {
      [ToolName.dySearch]: dySearchTool,
      [ToolName.insSearch]: insSearchTool,
      [ToolName.tiktokSearch]: tiktokSearchTool,
      // [ToolName.xhsSearch]: xhsSearchTool,  // 太贵了，先不用
      // [ToolName.reasoningThinking]: reasoningThinkingTool(),
    },
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    maxSteps: 2,
    system: personaAgentSystem({ persona, language: "中英皆可" }),
    messages: messages,
    abortSignal: req.signal,
    onError: (error) => {
      console.error("Error occurred:", error);
    },
  });

  return streamTextResult.toDataStreamResponse();
}
