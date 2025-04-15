import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/llm";
import { personaAgentSystem } from "@/prompt";
import { dySearchTool, reasoningThinkingTool, ToolName, xhsSearchTool } from "@/tools";
import { Message, streamText } from "ai";
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
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    tools: {
      [ToolName.xhsSearch]: xhsSearchTool,
      [ToolName.dySearch]: dySearchTool,
      [ToolName.reasoningThinking]: reasoningThinkingTool(),
    },
    maxSteps: 3,
    system: personaAgentSystem(persona),
    messages: messages,
    abortSignal: req.signal,
  });

  return streamTextResult.toDataStreamResponse();
}
