import { StudyToolName } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { isToolOrDynamicToolUIPart, isToolUIPart } from "ai";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudyReplayIntro } from "./components/StudyReplayIntro";
import { useStudyContext } from "./hooks/StudyContext";
import { useProgressiveMessages } from "./hooks/useProgressiveMessages";
import { SingleMessage } from "./SingleMessage";

export function ChatReplay() {
  const { studyUserChat, setLastToolInvocation } = useStudyContext();
  const locale = useLocale();
  const t = useTranslations("StudyPage.ChatReplay");
  const { data: session } = useSession();

  // 开场动画状态
  const [introCompleted, setIntroCompleted] = useState(false);

  // 获取第一条用户消息的文本
  const firstUserMessageText = useMemo(() => {
    const firstUserMessage = studyUserChat.messages.find((msg) => msg.role === "user");
    if (!firstUserMessage?.parts) return "";
    const textPart = firstUserMessage.parts.find((part) => part.type === "text");
    return textPart && "text" in textPart ? textPart.text : "";
  }, [studyUserChat.messages]);

  const {
    partialMessages: messagesDisplay,
    skipToEnd,
    jumpToProgress,
    isCompleted,
  } = useProgressiveMessages({
    uniqueId: `studyUserChat-${studyUserChat.id}`,
    messages: studyUserChat.messages,
    enabled: introCompleted, // 开场完成后才开始回放
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

  // 找到最后一个 report tool 的 toolCallId
  const lastReportToolCallId = useMemo(() => {
    for (let i = studyUserChat.messages.length - 1; i >= 0; i--) {
      const message = studyUserChat.messages[i];
      if (!message.parts) continue;
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (
          isToolUIPart(part) &&
          part.type === `tool-${StudyToolName.generateReport}` &&
          part.state === "output-available"
        ) {
          return part.toolCallId;
        }
      }
    }
    return null;
  }, [studyUserChat.messages]);

  // 滚动到最后一个 report
  const scrollToLastReport = useCallback(() => {
    if (!lastReportToolCallId) return;

    // 通过 data-tool-call-id 找到 report 元素
    const reportElement = messagesContainerRef.current?.querySelector(
      `[data-tool-call-id="${lastReportToolCallId}"]`,
    );
    if (reportElement) {
      reportElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [lastReportToolCallId, messagesContainerRef]);

  // 自定义的 skipToEnd，完成后滚动到 report
  const handleSkipToEnd = useCallback(() => {
    skipToEnd();
    // 等待消息渲染完成后滚动
    setTimeout(() => {
      scrollToLastReport();
    }, 300);
  }, [skipToEnd, scrollToLastReport]);

  // 计算进度：基于 parts 数量
  const totalParts = useMemo(() => {
    return studyUserChat.messages.reduce((sum, msg) => sum + (msg.parts?.length || 1), 0);
  }, [studyUserChat.messages]);

  const displayedParts = useMemo(() => {
    return messagesDisplay.reduce((sum, msg) => sum + (msg.parts?.length || 1), 0);
  }, [messagesDisplay]);

  const progress = totalParts > 0 ? (displayedParts / totalParts) * 100 : 0;

  return (
    <div className="flex-1 overflow-hidden relative">
      {/* 开场动画 */}
      {!introCompleted && (
        <StudyReplayIntro
          title={studyUserChat.title || "Research Study"}
          firstUserMessage={firstUserMessageText}
          onComplete={() => setIntroCompleted(true)}
        />
      )}
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
          />
        ))}

        {/* AI Compliance Disclaimer */}
        {messagesDisplay.length > 0 && (
          <div className="w-full text-xs text-left text-zinc-500 dark:text-zinc-400 mb-6">
            {locale === "zh-CN" ? "以上内容由人工智能生成" : ""}
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md">
          <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg pl-4 pr-2 py-1.5 flex items-center gap-3">
            {/* 进度信息 */}
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
              {Math.round(progress)}%
            </div>

            {/* 可拖动进度条 */}
            <div className="flex-1 relative group">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => jumpToProgress(Number(e.target.value) / 100)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* 拖动手柄 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>

            {/* 步数信息 */}
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
              {displayedParts}/{totalParts}
            </div>

            {/* Skip 图标按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipToEnd}
              className="h-8 w-8 rounded-full shrink-0"
              title={t("skipToEnd")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
