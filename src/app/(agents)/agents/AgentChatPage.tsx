"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { SimpleAgentTools } from "../tools/types";
import { SimpleAgentToolUIPartDisplay } from "../tools/ui";

export function AgentChatPage<UI_MESSAGE extends TMessageWithPlainTextTool<SimpleAgentTools>>({
  userChatToken,
  chatTitle,
  nickname,
  avatar,
  useChatAPI,
  readOnly,
  initialMessages = [],
  persistMessages = true,
}: {
  userChatToken: string;
  chatTitle?: string;
  nickname?: Parameters<typeof UserChatSession>[0]["nickname"];
  avatar?: Parameters<typeof UserChatSession>[0]["avatar"];
  useChatAPI?: string;
  readOnly?: boolean;
  initialMessages?: UI_MESSAGE[];
  persistMessages?: boolean;
}) {
  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  const useChatHelpers = useChat<UI_MESSAGE>({
    // id: chatId,
    // experimental_throttle: 300,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: useChatAPI,
      prepareSendMessagesRequest: persistMessages
        ? ({ messages, id }) => {
            const { id: messageId, role, parts } = prepareLastUIMessageForRequest(messages);
            const body: ClientMessagePayload = {
              id,
              message: { id: messageId, role, parts },
              ...extraRequestPayload,
            };
            return { body };
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
      <UserChatSession<UI_MESSAGE>
        chatTitle={chatTitle}
        nickname={nickname}
        avatar={avatar}
        readOnly={readOnly}
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        renderToolUIPart={(toolPart) => <SimpleAgentToolUIPartDisplay toolUIPart={toolPart} />}
        persistMessages={persistMessages}
        acceptAttachments={false}
      />
    </FitToViewport>
  );
}
