import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
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
    <>
      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col pb-12 w-full items-center overflow-y-auto scrollbar-thin"
      >
        {messagesDisplay
          .filter((message) => !message.content.includes("免费研究额度已经用完"))
          .map((message, index) => (
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
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={skipToEnd}>
            {t("skipToEnd")}
          </Button>
        </div>
      )}
    </>
  );
}
