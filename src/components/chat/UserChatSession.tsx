"use client";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtils";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn, useDevice } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { RefObject, useCallback } from "react";
import HippyGhostAvatar from "../HippyGhostAvatar";
import { ChatMessage } from "./ChatMessage";

export function UserChatSession({
  chatId,
  chatTitle,
  readOnly,
  limit,
  useChatHelpers: { messages, status, error, handleSubmit, input, setInput },
  useChatRef,
}: {
  chatId?: string;
  chatTitle?: string;
  readOnly?: boolean;
  limit?: number; // 向前保留的消息数量
  useChatHelpers: Omit<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">;
  useChatRef: RefObject<Pick<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">>;
}) {
  const t = useTranslations("Components.UserChatSession");
  const locale = useLocale();
  const { data: session } = useSession();

  const handleContinueChat = useCallback(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      useChatRef.current.reload();
    } else {
      useChatRef.current.append({ role: "user", content: CONTINUE_ASSISTANT_STEPS });
    }
    // 不要监听 reload, append
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";
  const { isMobile } = useDevice();

  return (
    <div className="w-full h-full overflow-hidden relative pb-4">
      <div
        ref={messagesContainerRef}
        className={cn(
          "h-full w-full overflow-y-auto scrollbar-thin flex flex-col items-center gap-4",
          "pt-16 pb-80 px-3",
        )}
      >
        {(limit ? messages.slice(-limit) : messages).map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            nickname={
              message.role === "user"
                ? t("you")
                : message.role === "assistant"
                  ? "atypica.AI"
                  : message.role
            }
            avatar={{
              user: session?.user ? (
                <HippyGhostAvatar className="size-8" seed={session.user.id} />
              ) : undefined,
              assistant: <HippyGhostAvatar className="size-8" seed={chatId} />,
            }}
            content={message.content}
            parts={message.parts}
          ></ChatMessage>
        ))}
        {error && (
          <div className="flex justify-center items-center text-red-500 dark:text-red-400 text-sm">
            {error.toString()}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatTitle && (
        <div className="absolute top-0 left-0 right-0 p-3 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
          <h1 className="sm:text-lg font-medium text-center truncate">{chatTitle}</h1>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 w-full px-3 max-lg:px-1 pb-3 max-lg:pb-1">
        {!readOnly && (
          <div className="w-fit mx-auto mb-3 max-lg:mb-1.5 px-4 py-2 rounded-full shadow bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <StatusDisplay status={status} />
          </div>
        )}
        {!readOnly && (
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              className={cn(
                "block min-h-24 max-lg:min-h-20 resize-none focus-visible:border-primary/50 transition-colors rounded-lg",
                "px-4 pt-3 pb-11",
                "bg-background text-[15px] placeholder:text-[15px]", // "text-sm placeholder:text-sm",
              )}
              enterKeyHint="enter"
              value={input}
              disabled={inputDisabled}
              onChange={(event) => {
                setInput(event.target.value);
              }}
              onKeyDown={(e) => {
                if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (input.trim()) {
                    const form = e.currentTarget.form;
                    if (form) form.requestSubmit();
                  }
                }
              }}
            />
            <div className="absolute right-2 bottom-2 max-lg:right-1 max-lg:bottom-1 max-lg:scale-90 max-lg:origin-bottom-right flex items-center gap-2">
              {!inputDisabled && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs origin-top-right"
                  onClick={handleContinueChat}
                >
                  <PlayIcon className="size-2.5" />
                  <span>{t("continue")}</span>
                </Button>
              )}
              <VoiceInputButton
                disabled={inputDisabled}
                onTranscript={(text) => {
                  setInput((current) => (current ? `${current} ${text}` : text));
                }}
                language={locale === "zh-CN" ? "zh-CN" : "en-US"}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={inputDisabled || !input.trim()}
                className="rounded-full size-9"
              >
                <ArrowRightIcon className="h-5 w-5 text-primary" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
