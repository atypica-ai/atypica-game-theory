import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { isToolOrDynamicToolUIPart } from "ai";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import { useStudyContext } from "./hooks/StudyContext";
import { useProgressiveMessages } from "./hooks/useProgressiveMessages";
import { SingleMessage } from "./SingleMessage";

export function ChatReplay() {
  const { studyUserChat, setLastToolInvocation } = useStudyContext();
  const t = useTranslations("StudyPage.ChatReplay");
  const tCompliance = useTranslations("AICompliance");
  const { data: session } = useSession();
  const {
    partialMessages: messagesDisplay,
    skipToEnd,
    isCompleted,
  } = useProgressiveMessages({
    uniqueId: `studyUserChat-${studyUserChat.id}`,
    messages: studyUserChat.messages,
    enabled: true,
  });

  const isOwnStudy = session?.user?.id === studyUserChat.userId;

  useEffect(() => {
    for (let i = messagesDisplay.length - 1; i >= 0; i--) {
      const message = messagesDisplay[i];
      if (!message.parts) {
        continue;
      }
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (isToolOrDynamicToolUIPart(part)) {
          setLastToolInvocation(part);
          return;
        }
      }
    }
  }, [messagesDisplay, setLastToolInvocation]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  return (
    <div className="flex-1 overflow-hidden relative">
      <div
        ref={messagesContainerRef}
        className={cn(
          "h-full w-full flex flex-col items-center gap-4 overflow-y-auto scrollbar-thin",
          "pt-4 px-4",
        )}
      >
        {messagesDisplay.map((message, index) => (
          <SingleMessage
            key={message.id}
            message={message}
            renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
            avatar={
              message.role === "assistant" ? (
                <HippyGhostAvatar seed={studyUserChat.token} />
              ) : undefined
            }
            isLastMessage={index === messagesDisplay.length - 1}
          ></SingleMessage>
        ))}

        {/* AI Compliance Disclaimer */}
        {messagesDisplay.length > 0 && (
          <div className="w-full text-xs text-center text-zinc-500 dark:text-zinc-400 px-4 mt-4 mb-8">
            {tCompliance("fullDisclaimer")}
          </div>
        )}

        {isCompleted ? (
          <div className="mt-30 mb-30 flex flex-col items-center gap-4 bg-background/95 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {isOwnStudy ? t("continueStudyTitle") : t("startNewStudyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isOwnStudy ? t("continueStudyDescription") : t("startNewStudyDescription")}
              </p>
            </div>
            <div className="flex gap-3">
              {isOwnStudy ? (
                <Button asChild>
                  <Link href={`/study/${studyUserChat.token}`}>{t("continueStudy")}</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/">{t("startNewStudy")}</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-60" />
        )}
        <div ref={messagesEndRef} />
      </div>
      {!isCompleted && (
        // StudyPageClient 的 left panel 容器是 relative 的
        <div className="flex justify-center absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button variant="outline" size="sm" onClick={skipToEnd}>
            {t("skipToEnd")}
          </Button>
        </div>
      )}
    </div>
  );
}
