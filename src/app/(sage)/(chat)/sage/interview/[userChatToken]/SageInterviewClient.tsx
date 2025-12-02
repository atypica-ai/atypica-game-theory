"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { endSageInterviewAction } from "@/app/(sage)/actions";
import { SageToolUIPartDisplay } from "@/app/(sage)/tools/ui";
import { SageInterviewExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import type { SageInterview } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function SageInterviewClient({
  userChatToken,
  sage,
  interview,
  initialMessages = [],
}: {
  userChatToken: string;
  sage: {
    id: number;
    token: string;
    name: string;
    domain: string;
    expertise: string[];
    // user: Pick<User, "id" | "name" | "email">;
  };
  interview: Omit<SageInterview, "extra"> & {
    extra: SageInterviewExtra;
  };
  initialMessages?: TSageMessageWithTool[];
}) {
  const t = useTranslations("Sage.InterviewPage");
  const { data: session } = useSession();
  const router = useRouter();
  const requestSentRef = useRef(false);
  const [isEndingInterview, setIsEndingInterview] = useState(false);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  const handleEndInterview = useCallback(async () => {
    if (!interview.extra.ongoing) {
      toast.error(t("interviewAlreadyCompleted"));
      return;
    }

    setIsEndingInterview(true);
    try {
      const result = await endSageInterviewAction(interview.id);
      if (!result.success) throw result;
      toast.success(t("interviewEnded"));
      router.push(`/sage/${sage.token}/gaps`);
    } catch (error) {
      toast.error(`${t("endInterviewFailed")}: ${(error as Error).message}`);
    } finally {
      setIsEndingInterview(false);
    }
  }, [interview.id, t, router]);

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
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("purpose")}</p>
              </div>
            </div>
            {interview.extra.ongoing ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {t("ongoing")}
                </span>
                <ConfirmDialog
                  title={t("endInterview")}
                  onConfirm={() => handleEndInterview()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEndingInterview}
                    className="h-7 text-xs"
                  >
                    <CheckCircle className="size-3" />
                    {isEndingInterview ? t("ending") : t("endInterview")}
                  </Button>
                </ConfirmDialog>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {t("completed")}
                </span>
              </div>
            )}
          </div>
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
          readOnly={!interview.extra.ongoing}
        />
      </div>
    </FitToViewport>
  );
}
