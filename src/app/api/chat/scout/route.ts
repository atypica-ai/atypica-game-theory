import { fetchUserChatById } from "@/data/UserChat";
import {
  appendStepToStreamingMessage,
  fixChatMessages,
  persistentAIMessageToDB,
} from "@/lib/messageUtils";
import openai from "@/lib/openai";
import { scoutSystem } from "@/prompt";
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
import { appendClientMessage, generateId, Message, streamText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payloadAwaited = await req.json();
  const scoutUserChatId = parseInt(payloadAwaited["scoutUserChatId"]);
  const newUserMessage = payloadAwaited["message"] as Message;
  const autoChat =
    typeof payloadAwaited["autoChat"] === "boolean" ? payloadAwaited["autoChat"] : false;
  if (!scoutUserChatId || !newUserMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // fetchUserChatById 这里会检查权限
  const result = await fetchUserChatById(scoutUserChatId, "scout");
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  const scoutUserChat = result.data;
  const initialMessages = appendClientMessage({
    messages: scoutUserChat.messages,
    message: newUserMessage,
  });

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
  const streamingMessage: Omit<Message, "role"> = {
    id: generateId(),
    content: "",
    parts: [],
  };
  const response = streamText({
    // model: openai("o3-mini"),
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
    system: scoutSystem({
      doNotStopUntilScouted: autoChat,
    }),
    messages: fixChatMessages(initialMessages, { removePendingTool: true }), // 传给 LLM 的时候需要修复
    tools,
    maxSteps: 15, // 每次请求只发送单条消息的情况，只能在后端设置 maxSteps，在后端不断 continue
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(scoutUserChatId, {
          role: "assistant",
          ...streamingMessage,
        });
      }
    },
    onError: async (error) => {
      console.log("Error occurred:", error);
    },
  });

  return response.toDataStreamResponse();
}
