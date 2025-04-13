"use client";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { UserChatWithMessages } from "@/data/UserChat";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function AgentChatPage({
  userChat,
  useChatAPI,
}: {
  userChat: UserChatWithMessages;
  useChatAPI: string;
}) {
  const { data: session } = useSession();
  const initialMessages = userChat.messages;
  const { messages, error, handleSubmit, input, setInput, status, reload } = useChat({
    api: useChatAPI,
    id: userChat.id.toString(),
    initialMessages,
    experimental_prepareRequestBody({ messages, id }) {
      return { message: messages[messages.length - 1], id };
    },
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages[initialMessages.length - 1]?.role === "user") {
      reload();
    }
  }, [initialMessages]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden",
        "flex flex-col items-stretch justify-between gap-4 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div className="relative w-full">
        <h1 className="sm:text-lg font-medium text-center truncate">{userChat.title}</h1>
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
              assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
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

      <StatusDisplay userChatId={userChat.id} status={status} />

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
    </div>
  );
}
