"use client";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { Message, useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

export function AgentChatPage({
  chatId,
  chatTitle,
  useChatAPI,
  readOnly,
  initialMessages = [],
  persistMessages = true,
}: {
  chatId?: string; // 不一定是 UserChat 的 id
  chatTitle?: string;
  useChatAPI?: string;
  readOnly?: boolean;
  initialMessages?: Message[];
  persistMessages?: boolean;
}) {
  const useChatHelpers = useChat({
    api: useChatAPI,
    id: chatId,
    initialMessages,
    experimental_prepareRequestBody: persistMessages
      ? ({ messages, id }) => {
          return { message: messages[messages.length - 1], id };
        }
      : undefined,
  });
  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages[initialMessages.length - 1]?.role === "user" && !readOnly) {
      useChatRef.current.reload();
    }
  }, [initialMessages, readOnly]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col items-stretch justify-start max-w-5xl mx-auto">
      <UserChatSession
        chatId={chatId}
        chatTitle={chatTitle}
        readOnly={readOnly}
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
      />
    </div>
  );
}
