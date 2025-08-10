"use client";
import { ClientMessagePayload } from "@/ai/messageUtilsClient";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface FollowUpInterviewClientProps {
  userChatToken: string;
  initialMessages?: Message[];
}

export default function FollowUpInterviewClient({
  userChatToken,
  initialMessages = [],
}: FollowUpInterviewClientProps) {
  const t = useTranslations("PersonaImport.followUpInterview");
  const router = useRouter();
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);

  const initialRequestBody = {
    userChatToken,
  };

  // 正确使用 useChat hook
  const useChatHelpers = useChat({
    api: "/api/chat/persona-followup",
    initialMessages,
    body: {
      ...initialRequestBody,
    },
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: ClientMessagePayload = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
    },
  });

  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  // Check interview completion status
  useEffect(() => {
    const checkInterviewStatus = async () => {
      // 检查最后一条消息是否包含结束标识
      const messages = useChatHelpers.messages || [];
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage &&
        (lastMessage.content.includes(t("interviewCompleted")) ||
          lastMessage.content.includes(t("thankYouParticipation")) ||
          lastMessage.parts?.some(
            (part) =>
              part.type === "tool-invocation" && part.toolInvocation.toolName === "endInterview",
          ))
      ) {
        setIsInterviewComplete(true);
      }
    };
    checkInterviewStatus();
  }, [userChatToken, useChatHelpers.messages, t]);

  // Monitor message changes to detect interview completion
  useEffect(() => {
    const messages = useChatHelpers.messages || [];
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      (lastMessage.content.includes(t("interviewCompleted")) ||
        lastMessage.content.includes(t("thankYouParticipation")) ||
        lastMessage.parts?.some(
          (part) =>
            part.type === "tool-invocation" && part.toolInvocation.toolName === "endInterview",
        ))
    ) {
      setIsInterviewComplete(true);
    }
  }, [useChatHelpers.messages, userChatToken, t]);

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
      <FocusedInterviewChat
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={false}
      />
    </FitToViewport>
  );
}
