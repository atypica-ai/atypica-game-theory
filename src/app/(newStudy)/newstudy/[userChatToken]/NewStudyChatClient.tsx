"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TNewStudyUITools } from "@/app/(newStudy)/tools/types";
import { TNewStudyMessageWithTool } from "@/app/(newStudy)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { trackEvent } from "@/lib/analytics/segment";
import { truncateForTitle } from "@/lib/textUtils";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { CountdownRedirect } from "./CountdownRedirect";

type NEW_STUDY_UI_MESSAGE = TNewStudyMessageWithTool<
  TNewStudyUITools,
  ClientMessagePayload["message"]["metadata"]
>;

export function NewStudyChatClient({
  userChat,
  initialMessages,
}: {
  userChat: UserChat;
  initialMessages: NEW_STUDY_UI_MESSAGE[];
  user: { id: number; email: string };
}) {
  const locale = useLocale();
  const t = useTranslations("NewStudyChatPage");

  const trackStudyBriefUpdated = useDebouncedCallback((brief: string) => {
    trackEvent("Study Brief Updated", {
      brief: truncateForTitle(brief, { maxDisplayWidth: 30, suffix: "..." }),
      interview: true,
    });
  }, 2000);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChat.token }), [userChat.token]);

  const useChatHelpers = useChat({
    id: userChat.id.toString(),
    // experimental_throttle: 30,
    messages: initialMessages,
    onFinish() {
      // Logic to run when the AI finishes its response.
    },
    onError(err) {
      console.error("Chat error:", err);
      // TODO: Implement user-facing error feedback (e.g., a toast notification).
    },
    transport: new DefaultChatTransport<NEW_STUDY_UI_MESSAGE>({
      api: `/api/chat/newstudy`,
      prepareSendMessagesRequest({ id, messages }) {
        const { id: messageId, role, lastPart, metadata } = prepareLastUIMessageForRequest(messages);
        setTimeout(() => {
          trackStudyBriefUpdated(
            lastPart.type === "text" ? lastPart.text : "",
          );
        }, 100);
        const body: ClientMessagePayload = {
          id,
          message: { id: messageId, role, lastPart, metadata },
          ...extraRequestPayload,
        };
        return { body };
      },
    }),
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const { messages } = useChatHelpers;

  // Determine planning state based on messages content
  const planningState = useMemo(() => {
    // Check if any message has endInterview tool result
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        // ⚠️ 这里是兼容 v4 旧的历史消息的，因为所有消息从数据库取出给 useChat 用之前都会调用 convertToV5MessagePart
        (part) => part.type === "tool-endInterview" && part.state === "output-available",
      ),
    );
    if (hasEndInterviewResult) {
      return "summary";
    }
    return "active";
  }, [messages]);

  const summary = useMemo(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (part.type === "tool-endInterview" && part.state === "output-available") {
          const brief = part.input.studyBrief;
          setTimeout(() => trackStudyBriefUpdated(brief), 100);
          return brief;
        }
      }
    }
    return "";
  }, [messages, trackStudyBriefUpdated]);

  // Automatically start the conversation when the component mounts.
  const requestSentRef = useRef(false);
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

  const chatWithAIArea = (
    <FitToViewport>
      <FocusedInterviewChat<NEW_STUDY_UI_MESSAGE>
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={true}
        locale={locale}
      />
    </FitToViewport>
  );

  const briefCountdownArea = (
    <FitToViewport>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-left max-w-2xl mx-auto text-zinc-900 dark:text-zinc-100 w-full min-h-64 px-6 py-12 sm:py-40"
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
    </FitToViewport>
  );

  return planningState === "summary" ? briefCountdownArea : chatWithAIArea;
}
