"use client";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { CONTINUE_ASSISTANT_STEPS } from "@/lib/messageUtils";
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
  readOnly = false,
  useChatHelpers: { messages, status, error, handleSubmit, input, setInput },
  useChatRef,
}: {
  chatId?: string;
  chatTitle?: string;
  readOnly?: boolean;
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
  }, [messages]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";
  const { isMobile } = useDevice();

  return (
    <div
      className={cn(
        "w-full h-full overflow-hidden",
        "flex flex-col items-stretch justify-between gap-3",
      )}
    >
      {chatTitle && (
        <div className="relative w-full mt-3">
          <h1 className="sm:text-lg font-medium text-center truncate">{chatTitle}</h1>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col gap-6 w-full items-center overflow-y-auto scrollbar-thin p-3"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            nickname={message.role === "user" ? session?.user?.email : message.role}
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

      {!readOnly && <StatusDisplay status={status} />}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="relative mx-3 mb-3">
          <Textarea
            className={cn(
              "block min-h-24 max-lg:min-h-20 text-sm placeholder:text-sm resize-none focus-visible:border-primary/50 transition-colors rounded-lg py-3 px-4",
              inputDisabled ? "opacity-50 cursor-not-allowed" : "",
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
          <div className="absolute right-1 bottom-1 lg:right-2 lg:bottom-2 flex items-center gap-2">
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
  );
}
