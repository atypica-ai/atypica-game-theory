import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useStudyContext } from "./hooks/StudyContext";
import { useProgressiveMessages } from "./hooks/useProgressiveMessages";
import { SingleMessage } from "./SingleMessage";

export function ChatReplay() {
  const { studyUserChat } = useStudyContext();
  const t = useTranslations("StudyPage.ChatReplay");
  const {
    partialMessages: messagesDisplay,
    skipToEnd,
    isCompleted,
  } = useProgressiveMessages({
    uniqueId: `studyUserChat-${studyUserChat.id}`,
    messages: studyUserChat.messages,
    enabled: true,
  });
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  return (
    <div className="flex-1 overflow-hidden relative">
      <div
        ref={messagesContainerRef}
        className={cn(
          "h-full w-full flex flex-col items-center gap-4 overflow-y-auto scrollbar-thin",
          "pt-4 px-4 pb-80",
        )}
      >
        {messagesDisplay.map((message, index) => (
          <SingleMessage
            key={message.id}
            addToolResult={() => {}}
            message={message}
            avatar={{ assistant: <HippyGhostAvatar seed={studyUserChat.token} /> }}
            isLastMessage={index === messagesDisplay.length - 1}
          ></SingleMessage>
        ))}
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
