"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { SageToolUIPartDisplay } from "@/app/(sage)/tools/ui";
import { SageExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import type { Sage, User } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef } from "react";

export function SageChatClient({
  userChatToken,
  sage,
  initialMessages = [],
}: {
  userChatToken: string;
  sage: Omit<Sage, "expertise" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    user: Pick<User, "id" | "name" | "email">;
  };
  initialMessages?: TSageMessageWithTool[];
}) {
  const { data: session } = useSession();
  const requestSentRef = useRef(false);
  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  // Chat hooks
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/sage",
      prepareSendMessagesRequest({ id, messages, body: extraBody }) {
        const body: ClientMessagePayload = {
          id,
          message: prepareLastUIMessageForRequest(messages),
          ...extraRequestPayload,
        };
        if (extraBody && "attachments" in extraBody) {
          body["attachments"] = extraBody.attachments;
        }
        return { body };
      },
    }),
    experimental_throttle: 300,
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  // Auto-start interview if no messages
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.sendMessage({ text: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.regenerate();
    }
  }, [initialMessages]);

  return (
    <FitToViewport className="flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="w-full mt-2 px-3 py-3 max-w-4xl mx-auto">
        <h1 className="font-medium text-sm text-center">{sage.name}</h1>
        {sage.domain && (
          <p className="text-xs text-muted-foreground text-center mt-1">{sage.domain}</p>
        )}
      </div>

      {/* Centered Chat Area */}
      <div className="flex-1 overflow-hidden w-full max-w-4xl mx-auto flex flex-col">
        <UserChatSession
          nickname={{ assistant: sage.name, user: session?.user?.email ?? "You" }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed={sage.id} />,
            user: session?.user ? (
              <HippyGhostAvatar className="size-8" seed={session.user.id} />
            ) : undefined,
          }}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          renderToolUIPart={(toolPart) => <SageToolUIPartDisplay toolUIPart={toolPart} />}
          acceptAttachments={true}
        />
      </div>
    </FitToViewport>
  );
}
