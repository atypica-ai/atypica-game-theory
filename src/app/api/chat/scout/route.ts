import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/llm";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareNewMessageForStreaming,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { scoutSystemVerbose } from "@/prompt";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  reasoningThinkingTool,
  savePersonaTool,
  ToolName,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/tools";
import { Message, streamText } from "ai";
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
  // const autoChat = typeof payload["autoChat"] === "boolean" ? payload["autoChat"] : false;
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
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId }),
  };
  const response = streamText({
    // model: openai("gpt-4o", {
    //   parallelToolCalls: true,
    // }),
    model: openai("claude-3-7-sonnet-beta"),
    // model: bedrock("claude-3-7-sonnet"),
    providerOptions: {
      openai: {
        stream_options: { include_usage: true },
        // IMPORTANT: litellm 不支持这个 bedrock 的参数输入，但是在 litellm model 配置里设置了，它会发给 bedrock api
        // anthropic_beta: ["token-efficient-tools-2025-02-19"],
      },
    },
    system: scoutSystemVerbose({
      doNotStopUntilScouted: false,
      // doNotStopUntilScouted: autoChat,
    }),
    messages: coreMessages,
    tools,
    maxSteps: 15, // 每次请求只发送单条消息的情况，只能在后端设置 maxSteps，在后端不断 continue
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
