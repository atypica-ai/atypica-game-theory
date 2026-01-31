"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TPersonaUITools } from "@/app/(persona)/tools/types";
import { TPersonaMessageWithTool } from "@/app/(persona)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ShieldIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type PERSONA_UI_MESSAGE = TPersonaMessageWithTool<
  TPersonaUITools,
  ClientMessagePayload["message"]["metadata"]
>;

export default function FollowUpInterviewClient({
  userChatToken,
  initialMessages = [],
}: {
  userChatToken: string;
  initialMessages?: PERSONA_UI_MESSAGE[];
}) {
  const locale = useLocale();
  const t = useTranslations("PersonaImport.followUpInterview");
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  // 正确使用 useChat hook
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport<PERSONA_UI_MESSAGE>({
      api: "/api/chat/persona-followup",
      prepareSendMessagesRequest({ id, messages }) {
        const message = prepareLastUIMessageForRequest(messages);
        const body: ClientMessagePayload = {
          id,
          message,
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

  // Monitor message changes to detect interview completion
  useEffect(() => {
    const messages = useChatHelpers.messages || [];
    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = (lastMessage.parts ?? [])
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");
    if (
      lastMessage &&
      (lastMessageContent.includes(t("interviewCompleted")) ||
        lastMessageContent.includes(t("thankYouParticipation")) ||
        lastMessage.parts?.some((part) => part.type === "tool-endInterview"))
    ) {
      setIsInterviewComplete(true);
    }
  }, [userChatToken, useChatHelpers.messages, t]);

  // Interview completion interface
  if (isInterviewComplete) {
    return (
      <div className="h-dvh w-dvw flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <ShieldIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {t("interviewComplete")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{t("thankYou")}</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t("summaryNote")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FitToViewport>
      <FocusedInterviewChat<PERSONA_UI_MESSAGE>
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={false}
        locale={locale}
      />
    </FitToViewport>
  );
}
