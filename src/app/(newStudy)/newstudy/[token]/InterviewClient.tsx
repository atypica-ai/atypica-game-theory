"use client";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { useDevice } from "@/lib/utils";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { generateId, Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Ear, Loader2Icon, Send, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { CountdownRedirect } from "./CountdownRedirect";

const DEFAULT_TIME_LEFT = 300; // seconds

const NewStudyBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  }),
  userChatId: z.number(),
});

// Custom textarea component with forwardRef support
const CustomTextarea = React.forwardRef<HTMLTextAreaElement, any>(
  ({ className = "", onInput, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={className}
        onInput={(e) => {
          // Auto-resize textarea
          const target = e.target as HTMLTextAreaElement;
          target.style.height = "auto";
          target.style.height = Math.min(target.scrollHeight, 128) + "px";
          onInput?.(e);
        }}
        {...props}
      />
    );
  },
);

CustomTextarea.displayName = "CustomTextarea";

export function InterviewClient({
  userChat,
  initialMessages,
}: {
  userChat: UserChat;
  initialMessages: Message[];
  user: { id: number; email: string };
}) {
  const router = useRouter();
  const locale = useLocale();
  const { isMobile } = useDevice();
  const t = useTranslations("NewStudyPage");

  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LEFT);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastUserMessage, setLastUserMessage] = useState<Message | null>(null);

  const initialRequestBody = {
    userChatId: userChat.id,
  };

  const useChatHelpers = useChat({
    id: userChat.id.toString(),
    api: `/api/chat/newstudy`,
    experimental_throttle: 30,
    initialMessages,
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof NewStudyBodySchema> = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
    },
    onFinish() {
      // Logic to run when the AI finishes its response.
      setIsTimerActive(true);
    },
    onError(err) {
      console.error("Chat error:", err);
      // TODO: Implement user-facing error feedback (e.g., a toast notification).
    },
  });

  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const { messages, input, setInput, handleSubmit, status, error, stop } = useChatHelpers;

  // Determine planning state based on messages content
  const planningState = useMemo(() => {
    // Check if any message has endInterview tool result
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === "endInterview" &&
          part.toolInvocation.state === "result",
      ),
    );

    if (hasEndInterviewResult) {
      return "summary";
    }

    return "active";
  }, [messages]);

  const summary = useMemo(() => {
    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === "endInterview" &&
            part.toolInvocation.state === "result"
          ) {
            return part.toolInvocation.result.studyBrief || t("studyPlanningComplete");
          }
        }
      }
    }
    return "";
  }, [messages]);

  // Enhanced handleSubmit with refocus
  const handleSubmitWithFocus = useCallback(
    (e: React.FormEvent) => {
      const messageToSend = {
        role: "user" as const,
        content: input,
        id: generateId(),
      };
      setLastUserMessage(messageToSend);
      handleSubmit(e, {
        data: {
          message: messageToSend,
        },
      });
      // Reset timeout state when user responds
      setHasTimedOut(false);
      setTimeLeft(DEFAULT_TIME_LEFT);
      setIsTimerActive(false);
      setIsTimerActive(false);
      setIsTimerActive(false);
      // Re-focus after a short delay to account for state updates
      setTimeout(() => {
        if (textareaRef.current && planningState === "active") {
          textareaRef.current.focus();
        }
      }, 50);
    },
    [handleSubmit, planningState, input],
  );

  // Auto focus input after AI streaming ends
  useEffect(() => {
    if (status === "ready" && planningState === "active" && textareaRef.current) {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [status, planningState]);

  // Auto focus input on initial load
  useEffect(() => {
    if (planningState === "active" && textareaRef.current) {
      // Delay to ensure component is fully mounted
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 500);
    }
  }, [planningState]);

  // Automatically start the conversation when the component mounts.
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.append({ role: "user", content: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    } else if (initialMessages[initialMessages.length - 1]?.role === "assistant") {
      // If the last message is from the assistant, start the timer.
      setIsTimerActive(true);
    }
  }, [initialMessages]);

  const lastAssistantMessage = useMemo(() => {
    return messages.findLast((m) => m.role === "assistant");
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  // When a new assistant message is being generated, clear the last user message
  useEffect(() => {
    if (isLoading) {
      setLastUserMessage(null);
    }
  }, [isLoading]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  useEffect(() => {
    if (planningState !== "active" || !isTimerActive) return;

    if (timeLeft <= 0 && !hasTimedOut) {
      setHasTimedOut(true);
      // Send special message to AI indicating user hesitation
      useChatRef.current.append({ role: "user", content: "[USER_HESITATED]" });
      // Reset timer for next question
      setTimeLeft(DEFAULT_TIME_LEFT);
      setIsTimerActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [planningState, timeLeft, hasTimedOut, isTimerActive]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return t("timeRemaining", {
      time: `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`,
    });
  };

  const chatWithAIArea = (
    <div className="w-full h-full flex flex-col relative bg-zinc-50 dark:bg-zinc-900">
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          onClick={handleStop}
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl w-full mx-auto px-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 text-zinc-600 dark:text-zinc-400"
            >
              <div className="flex items-center gap-2">
                <Ear className="w-4 h-4 text-primary" />
                <span>{t("thinking")}</span>
              </div>
              {lastUserMessage && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic max-w-md truncate">
                  &quot;{lastUserMessage.content}&quot;
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={lastAssistantMessage?.id ?? "initial"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="text-xl sm:text-2xl font-EuclidCircularA font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed"
            >
              {!lastAssistantMessage
                ? t("gettingReady")
                : lastAssistantMessage.parts.map((part, index) => (
                    <div key={index}>
                      {part.type === "text"
                        ? part.text
                        : part.type === "tool-invocation"
                          ? t("execTool", { toolName: part.toolInvocation.toolName })
                          : ""}
                    </div>
                  ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom input area - fixed to bottom */}
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-8 pt-0">
        <div className="w-full text-zinc-600 dark:text-zinc-400 text-sm mb-3 px-2">
          <div className="flex justify-between items-center mb-2">
            <span>{t("theMoreDetailed")}</span>
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(1 - timeLeft / DEFAULT_TIME_LEFT) * 100}%` }}
            />
          </div>
        </div>
        <form
          onSubmit={handleSubmitWithFocus}
          className="relative flex items-center bg-white dark:bg-zinc-800 backdrop-blur-sm rounded-2xl p-2 w-full border border-zinc-200 dark:border-zinc-700"
        >
          <VoiceInputButton
            onTranscript={(text) => setInput((current) => (current ? `${current} ${text}` : text))}
            language={locale}
            disabled={isLoading}
            className="ml-2 p-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex-shrink-0 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors bg-zinc-50 dark:bg-zinc-800"
          />
          <CustomTextarea
            ref={textareaRef}
            value={input}
            onInput={(e: any) => setInput(e.target.value)}
            placeholder={t("shareThoughts")}
            rows={1}
            disabled={isLoading}
            className="flex min-h-[48px] w-full resize-none bg-transparent border-none
            focus-visible:ring-0 focus-visible:ring-offset-0 outline-none
            text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 py-3 px-3 max-h-32
            text-base leading-relaxed overflow-hidden"
            onKeyDown={(e: any) => {
              if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) {
                  handleSubmitWithFocus(e);
                }
              }
            }}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex-shrink-0 w-12 h-12 transition-colors"
          >
            {isLoading ? (
              <Loader2Icon className="h-6 w-6 animate-spin" />
            ) : (
              <Send className="h-6 w-6" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );

  const briefCountdownArea = (
    <div className="flex items-center justify-center px-6 py-18">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-left max-w-2xl text-zinc-900 dark:text-zinc-100 w-full"
      >
        <h1 className="text-xl font-EuclidCircularA font-medium mb-6 text-center">
          {t("studyBriefReady")}
        </h1>
        <div className="mb-3 text-xs text-zinc-600 dark:text-zinc-400 text-center">
          {t("studyBriefDescription")}
        </div>
        <div className="max-h-96 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 p-4 rounded mb-12 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
          {summary}
        </div>
        <CountdownRedirect studyBrief={summary} userChatId={userChat.id} />
      </motion.div>
    </div>
  );

  return planningState === "summary" ? briefCountdownArea : chatWithAIArea;
}
