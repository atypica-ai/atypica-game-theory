"use client";
import { followUpChatBodySchema } from "@/app/(persona)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useEffect, useRef } from "react";
import { z } from "zod";

export function FollowUpInterviewClient({
  userChatToken,
  initialMessages = [],
}: {
  userChatToken: string;
  initialMessages?: Message[];
}) {
  const initialRequestBody = {
    userChatToken,
  };

  const useChatHelpers = useChat({
    api: "/api/persona/followup",
    initialMessages,
    body: {
      userChatToken: userChatToken,
    },
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof followUpChatBodySchema> = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
    },
  });

  const useChatRef = useRef({
    append: useChatHelpers.append,
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
  });

  // Automatically start the conversation when the component mounts.
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.append({ role: "user", content: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  return (
    <div className="h-screen w-full">
      <FocusedInterviewChat
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={false}
        className="h-full"
      />
    </div>
  );
}
