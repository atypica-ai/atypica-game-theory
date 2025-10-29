"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { SageToolUIPartDisplay } from "@/app/(sage)/tools/ui";
import { TSageMessageWithTool } from "@/app/(sage)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import type { ChatMessageAttachment, SageInterview, User } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, Target } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

export function SageInterviewClient({
  userChatToken,
  sage,
  interview,
  initialMessages = [],
}: {
  userChatToken: string;
  sage: {
    id: number;
    name: string;
    domain: string;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  interview: SageInterview & {
    sage: {
      userId: number;
    };
  };
  initialMessages?: TSageMessageWithTool[];
}) {
  const t = useTranslations("Sage.interview");
  const { data: session } = useSession();
  const requestSentRef = useRef(false);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  // Chat hooks
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/sage-interview",
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
      {/* Interview Info Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="size-5 text-zinc-600 dark:text-zinc-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("title")}: {sage.name}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {interview.purpose || t("purpose")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-zinc-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {t("progress")}: {Math.round(interview.progress * 100)}%
                </span>
              </div>
              <span
                className={
                  interview.status === "completed"
                    ? "px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                }
              >
                {interview.status === "completed" ? t("completed") : t("ongoing")}
              </span>
            </div>
          </div>

          {/* Focus Areas */}
          {interview.focusAreas && (interview.focusAreas as string[]).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(interview.focusAreas as string[]).map((area, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
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
          acceptAttachments={false}
        />
      </div>
    </FitToViewport>
  );
}
