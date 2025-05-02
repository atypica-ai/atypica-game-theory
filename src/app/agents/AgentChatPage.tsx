"use client";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { CONTINUE_ASSISTANT_STEPS } from "@/lib/messageUtils";
import { cn } from "@/lib/utils";
import { Message, useChat } from "@ai-sdk/react";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function AgentChatPage({
  chatId,
  chatTitle,
  useChatAPI,
  readOnly,
  initialMessages = [],
  persistMessages = true,
}: {
  chatId?: string; // 不一定是 UserChat 的 id
  chatTitle?: string;
  useChatAPI?: string;
  readOnly?: boolean;
  initialMessages?: Message[];
  persistMessages?: boolean;
}) {
  const { data: session } = useSession();
  const { messages, error, handleSubmit, input, setInput, status, reload, append } = useChat({
    api: useChatAPI,
    id: chatId,
    initialMessages,
    experimental_prepareRequestBody: persistMessages
      ? ({ messages, id }) => {
          return { message: messages[messages.length - 1], id };
        }
      : undefined,
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages[initialMessages.length - 1]?.role === "user" && !readOnly) {
      reload();
    }
  }, [initialMessages, reload, readOnly]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden",
        "flex flex-col items-stretch justify-between gap-4 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div className="relative w-full mt-4">
        <h1 className="sm:text-lg font-medium text-center truncate">{chatTitle}</h1>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col gap-6 w-full items-center overflow-y-auto scrollbar-thin"
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
        {!readOnly && !inputDisabled && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // reload(); // 不能 reload 而是 append 一个消息，reload 会在前端删除最后一条 assistant 消息，但其实后端还在
                append({ role: "user", content: CONTINUE_ASSISTANT_STEPS });
              }}
            >
              Continue
            </Button>
          </div>
        )}
        {error && (
          <div className="flex justify-center items-center text-red-500 dark:text-red-400 text-sm">
            {error.toString()}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!readOnly && <StatusDisplay status={status} />}
      {!readOnly && (
        <form onSubmit={handleSubmit}>
          <Textarea
            className={cn(
              "block min-h-24 max-lg:min-h-20 text-sm placeholder:text-sm resize-none focus-visible:border-primary/70 transition-colors rounded-lg py-3 px-4",
              inputDisabled ? "opacity-50 cursor-not-allowed" : "",
            )}
            enterKeyHint="enter"
            rows={3}
            value={input}
            disabled={inputDisabled}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={(e) => {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
          />
        </form>
      )}
    </div>
  );
}
