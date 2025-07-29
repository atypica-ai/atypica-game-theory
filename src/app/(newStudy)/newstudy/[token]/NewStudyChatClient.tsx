"use client";
import { ClientMessagePayload } from "@/ai/messageUtilsClient";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { CountdownRedirect } from "./CountdownRedirect";

export function NewStudyChatClient({
  userChat,
  initialMessages,
}: {
  userChat: UserChat;
  initialMessages: Message[];
  user: { id: number; email: string };
}) {
  const t = useTranslations("NewStudyPage");

  const initialRequestBody = {
    userChatToken: userChat.token,
  };

  const useChatHelpers = useChat({
    id: userChat.id.toString(),
    api: `/api/chat/newstudy`,
    // experimental_throttle: 30,
    initialMessages,
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: ClientMessagePayload = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
    },
    onFinish() {
      // Logic to run when the AI finishes its response.
    },
    onError(err) {
      console.error("Chat error:", err);
      // TODO: Implement user-facing error feedback (e.g., a toast notification).
    },
  });

  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const { messages } = useChatHelpers;

  // Determine planning state based on messages content
  const planningState = useMemo(() => {
    // Check if any message has endInterview tool result
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === "endInterview" &&
          part.toolInvocation.state === "result",
      ),
    );

    if (hasEndInterviewResult) {
      return "summary";
    }

    return "active";
  }, [messages]);

  const summary = useMemo(() => {
    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === "endInterview" &&
            part.toolInvocation.state === "result"
          ) {
            return part.toolInvocation.result.studyBrief || t("studyPlanningComplete");
          }
        }
      }
    }
    return "";
  }, [messages, t]);

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

  const chatWithAIArea = (
    <FocusedInterviewChat
      useChatHelpers={useChatHelpers}
      useChatRef={useChatRef}
      showTimer={true}
    />
  );

  const briefCountdownArea = (
    <div className="flex items-center justify-center px-6 py-18">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-left max-w-2xl text-zinc-900 dark:text-zinc-100 w-full"
      >
        <h1 className="text-xl font-EuclidCircularA font-medium mb-6 text-center">
          {t("studyBriefReady")}
        </h1>
        <div className="mb-3 text-xs text-zinc-600 dark:text-zinc-400 text-center">
          {t("studyBriefDescription")}
        </div>
        <div className="max-h-96 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 p-4 rounded mb-12 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
          {summary}
        </div>
        <CountdownRedirect studyBrief={summary} userChatId={userChat.id} />
      </motion.div>
    </div>
  );

  return planningState === "summary" ? briefCountdownArea : chatWithAIArea;
}
