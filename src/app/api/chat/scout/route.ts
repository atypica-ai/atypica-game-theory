import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareNewMessageForStreaming,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { scoutSystem } from "@/prompt";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  handleToolCallError,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  reasoningThinkingTool,
  savePersonaTool,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  toolCallError,
  ToolName,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/tools";
import { Message, streamText, ToolChoice } from "ai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const scoutUserChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as Message;
  if (!scoutUserChatId || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: { id: scoutUserChatId, kind: "scout" },
  });
  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }
  if (userChat.userId != userId) {
    return NextResponse.json(
      { error: "UserChat does not belong to the current user" },
      { status: 403 },
    );
  }

  const { coreMessages, streamingMessage } = await prepareNewMessageForStreaming(
    scoutUserChatId,
    newMessage,
  );

  const tools = {
    [ToolName.reasoningThinking]: reasoningThinkingTool(),
    [ToolName.xhsSearch]: xhsSearchTool,
    [ToolName.xhsUserNotes]: xhsUserNotesTool,
    [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
    [ToolName.dySearch]: dySearchTool,
    [ToolName.dyPostComments]: dyPostCommentsTool,
    [ToolName.dyUserPosts]: dyUserPostsTool,
    [ToolName.tiktokSearch]: tiktokSearchTool,
    [ToolName.tiktokPostComments]: tiktokPostCommentsTool,
    [ToolName.tiktokUserPosts]: tiktokUserPostsTool,
    [ToolName.insSearch]: insSearchTool,
    [ToolName.insUserPosts]: insUserPostsTool,
    [ToolName.insPostComments]: insPostCommentsTool,
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId }),
    [ToolName.toolCallError]: toolCallError,
  };
  let toolChoice: ToolChoice<typeof tools> = "auto";
  let maxSteps = 15;
  if (coreMessages.length > 2) {
    // toolChoice = {
    //   type: "tool",
    //   toolName: ToolName.savePersona,
    // };
    // maxSteps = 1;
    toolChoice = "auto";
    maxSteps = 5;
  }
  const response = streamText({
    model: llm("gemini-2.5-flash"),
    // model: llm("gpt-4o", {
    //   parallelToolCalls: true,
    // }),
    // model: llm("claude-3-7-sonnet-beta"),
    providerOptions: providerOptions,
    system: scoutSystem(),
    temperature: 0.5,
    messages: coreMessages,
    tools,
    toolChoice: toolChoice,
    experimental_repairToolCall: handleToolCallError,
    maxSteps: maxSteps, // 每次请求只发送单条消息的情况，只能在后端设置 maxSteps，在后端不断 continue
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
      }
    },
    onError: async (error) => {
      console.log("Error occurred:", error);
    },
  });

  return response.toDataStreamResponse();
}
