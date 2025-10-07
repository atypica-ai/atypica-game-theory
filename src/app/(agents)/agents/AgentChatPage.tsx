"use client";
import { StudyUITools, TMessageWithPlainTextTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";

export function AgentChatPage<UI_MESSAGE extends TMessageWithPlainTextTool<StudyUITools>>({
  chatId,
  chatTitle,
  nickname,
  avatar,
  useChatAPI,
  readOnly,
  initialMessages = [],
  persistMessages = true,
}: {
  chatId?: string; // 不一定是 UserChat 的 id
  chatTitle?: string;
  nickname?: Parameters<typeof UserChatSession>[0]["nickname"];
  avatar?: Parameters<typeof UserChatSession>[0]["avatar"];
  useChatAPI?: string;
  readOnly?: boolean;
  initialMessages?: UI_MESSAGE[];
  persistMessages?: boolean;
}) {
  const useChatHelpers = useChat<TMessageWithPlainTextTool<StudyUITools>>({
    id: chatId,
    experimental_throttle: 300,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: useChatAPI,
      prepareSendMessagesRequest: persistMessages
        ? ({ messages, id }) => {
            return { body: { message: messages[messages.length - 1], id } };
          }
        : undefined,
    }),
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages[initialMessages.length - 1]?.role === "user" && !readOnly) {
      useChatRef.current.regenerate();
    }
  }, [initialMessages, readOnly]);

  return (
    <FitToViewport className="flex-1 overflow-hidden flex flex-col items-stretch justify-start container mx-auto">
      <UserChatSession<TMessageWithPlainTextTool<StudyUITools>>
        chatId={chatId}
        chatTitle={chatTitle}
        nickname={nickname}
        avatar={avatar}
        readOnly={readOnly}
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        persistMessages={persistMessages}
        acceptAttachments={false}
      />
    </FitToViewport>
  );
}
