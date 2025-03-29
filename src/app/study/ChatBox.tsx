"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import {
  clearStudyUserChatBackgroundToken,
  deleteMessageFromUserChat,
  fetchUserChatById,
  StudyUserChat,
} from "@/data";
import { cn } from "@/lib/utils";
import { Message, useChat } from "@ai-sdk/react";
import { ArrowRightIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NerdStats } from "./NerdStats";
import { SingleMessage } from "./SingleMessage";
import { StatusDisplay } from "./StatusDisplay";

function popLastUserMessage(messages: Message[]) {
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    // pop 会修改 messages，导致调用 popLastUserMessage 的 currentChat 产生 state 变化，会有问题
    // const lastUserMessage = messages.pop();
    return { messages: messages.slice(0, -1), lastUserMessage: messages[messages.length - 1] };
  } else {
    return { messages, lastUserMessage: null };
  }
}

export function ChatBox({
  studyUserChat: {
    id: studyUserChatId,
    messages: initialMessages,
    backgroundToken: initialBackgroundToken,
  },
  readOnly,
}: {
  studyUserChat: StudyUserChat;
  readOnly: boolean;
}) {
  // 这个组件是不支持对话直接切换的，如果切换，需要刷新页面重新加载！);

  const {
    messages,
    setMessages,
    error,
    handleSubmit,
    input,
    setInput,
    status,
    stop,
    reload,
    append,
    addToolResult,
  } = useChat({
    id: studyUserChatId.toString(),
    initialMessages: initialMessages,
    sendExtraMessageFields: true, // send id and createdAt for each message
    api: "/api/chat/study",
    maxSteps: 30,
  });

  const useChatRef = useRef({ reload, append, stop, setMessages });

  useEffect(() => {
    // 如果最初最后一条消息是用户消息，则立即开始聊天
    const { lastUserMessage } = popLastUserMessage(initialMessages);
    if (lastUserMessage) {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  const handleSubmitMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSubmit(event);
    },
    [handleSubmit],
  );

  const [backgroundToken, setBackgroundToken] = useState<string | null>(initialBackgroundToken);
  const refreshStudyUserChat = useCallback(async () => {
    if (!backgroundToken) {
      return;
    }
    const studyUserChat = await fetchUserChatById(studyUserChatId, "study");
    setBackgroundToken(studyUserChat.backgroundToken);
    setMessages(studyUserChat.messages);
  }, [backgroundToken]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 3000);
      await refreshStudyUserChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshStudyUserChat]);

  // const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled =
    readOnly || !!backgroundToken || status === "streaming" || status === "submitted";

  return (
    <>
      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col pb-24 w-full items-center overflow-y-scroll"
      >
        {messages.map((message, index) => (
          <SingleMessage
            key={message.id}
            message={message}
            addToolResult={addToolResult}
            avatar={{ assistant: <HippyGhostAvatar seed={studyUserChatId} /> }}
            onDelete={
              message.role === "user" && index >= messages.length - 2
                ? async () => {
                    // TODO 这里要改一下
                    // assistant 可能连续出现 2 条，所以最后一条用户消息的index就不一定是 messages.length - 2
                    // 如果删除，那也就不是一条 user 和一条 assistant，而应该是连续的 assistant 都删除
                    const newMessages = await deleteMessageFromUserChat(
                      studyUserChatId,
                      messages,
                      message.id,
                    );
                    setMessages(newMessages);
                  }
                : undefined
            }
            isLastMessage={index === messages.length - 1}
          ></SingleMessage>
        ))}
        {error && (
          <div className="flex justify-center items-center text-red-500 text-sm mt-6">
            {error.toString()}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <StatusDisplay
          status={backgroundToken ? "background" : status}
          onAbort={() => clearStudyUserChatBackgroundToken(studyUserChatId)}
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <NerdStats studyUserChatId={studyUserChatId} />
        </div>
      </div>

      <form onSubmit={handleSubmitMessage} className="relative">
        <Textarea
          // ref={inputRef}
          className={cn(
            "block min-h-24 resize-none focus-visible:border-primary/70 transition-colors rounded-lg py-3 px-4",
            inputDisabled ? "opacity-50 cursor-not-allowed" : "",
          )}
          enterKeyHint="enter"
          placeholder="Ask a follow-up question or reply"
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
        <Button
          type="submit"
          variant="secondary"
          disabled={!input.trim()}
          className="rounded-full size-9 absolute right-4 bottom-4"
        >
          <ArrowRightIcon className="h-4 w-4 text-primary" />
        </Button>
      </form>
    </>
  );
}
