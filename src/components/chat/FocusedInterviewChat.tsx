"use client";

import { RecordButton } from "@/components/chat/RecordButton";
import { Button } from "@/components/ui/button";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { cn, useDevice } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { generateId } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Ear, Keyboard, Loader2Icon, Send, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_TIME_LEFT = 300; // seconds

// Custom textarea component with forwardRef support
interface CustomTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

const CustomTextarea = React.forwardRef<HTMLTextAreaElement, CustomTextareaProps>(
  ({ className = "", onInput, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={className}
        onInput={(e) => {
          // Auto-resize textarea
          const target = e.currentTarget;
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

interface FocusedInterviewChatProps {
  useChatHelpers: Omit<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">;
  useChatRef: React.RefObject<
    Pick<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">
  >;
  showTimer?: boolean;
  topRightButton?: React.ReactNode;
  className?: string;
}

export function FocusedInterviewChat({
  useChatHelpers,
  useChatRef,
  showTimer = true,
  topRightButton,
  className = "",
}: FocusedInterviewChatProps) {
  const locale = useLocale();
  const { isMobile } = useDevice();
  const t = useTranslations("Components.FocusedInterviewChat");

  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LEFT);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastUserMessage, setLastUserMessage] = useState<{ id: string; content: string } | null>(
    null,
  );
  const [showTextInput, setShowTextInput] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");

  const { messages, input, setInput, handleSubmit, status, stop } = useChatHelpers;

  const { isDocumentVisible } = useDocumentVisibility();

  // Enhanced handleSubmit with refocus
  const handleSubmitWithFocus = useCallback(
    (e: React.FormEvent) => {
      const messageContent = input.trim();
      if (!messageContent) return;

      const messageToSend = {
        role: "user" as const,
        content: messageContent,
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

      // Re-focus after a short delay to account for state updates
      setTimeout(() => {
        if (textareaRef.current && showTextInput) {
          textareaRef.current.focus();
        }
      }, 50);
    },
    [handleSubmit, input, showTextInput],
  );

  const handleTranscriptInternal = useCallback(
    (text: string) => {
      console.log("🎯 Final transcript received in FocusedInterviewChat:", text);
      if (text.trim()) {
        const messageToSend = {
          role: "user" as const,
          content: text,
          id: generateId(),
        };
        setLastUserMessage(messageToSend);

        console.log("📨 Sending transcript message to chat:", messageToSend.content);
        useChatRef.current?.append(messageToSend);

        // Reset timeout state when user responds
        setHasTimedOut(false);
        setTimeLeft(DEFAULT_TIME_LEFT);
        setIsTimerActive(false);
        setPartialTranscript(""); // Clear partial transcript
        console.log("✅ Transcript processing completed, chat updated");
      }
    },
    [useChatRef],
  );

  const handlePartialTranscriptInternal = useCallback((text: string) => {
    console.log("⚡ Partial transcript received in FocusedInterviewChat:", text);
    setPartialTranscript(text);
  }, []);

  // Auto focus input after AI streaming ends
  useEffect(() => {
    if (status === "ready" && textareaRef.current && showTextInput) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [status, showTextInput]);

  // Auto focus input when text input is shown
  useEffect(() => {
    if (showTextInput && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [showTextInput]);

  const lastAssistantMessage = useMemo(() => {
    return messages.findLast((m) => m.role === "assistant");
  }, [messages]);

  // When a new assistant message is being generated, clear the last user message
  useEffect(() => {
    if (status === "streaming") {
      setLastUserMessage(null);
    }
  }, [status]);

  // Start timer when AI finishes response
  useEffect(() => {
    if (status === "ready" && lastAssistantMessage && showTimer) {
      setIsTimerActive(true);
    }
  }, [status, lastAssistantMessage, showTimer]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // Timer effect
  useEffect(() => {
    if (!isTimerActive || !isDocumentVisible || !showTimer) {
      return;
    }

    if (timeLeft <= 0 && !hasTimedOut) {
      setHasTimedOut(true);
      // Send special message to AI indicating user hesitation
      useChatRef.current?.append({ role: "user", content: "[USER_HESITATED]" });
      // Reset timer for next question
      setTimeLeft(DEFAULT_TIME_LEFT);
      setIsTimerActive(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, hasTimedOut, isTimerActive, isDocumentVisible, showTimer, useChatRef]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return t("timeRemaining", {
      time: `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`,
    });
  };

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col relative bg-zinc-50 dark:bg-zinc-900 pb-8",
        "flex-1 overflow-auto",
        className,
      )}
    >
      {/* Top bar with language indicator and controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
          {locale === "zh-CN" ? "中文" : "English"}
        </div>
      </div>

      {/* Top right button */}
      {topRightButton && <div className="absolute top-4 right-4 z-10">{topRightButton}</div>}

      {/* Stop button when streaming */}
      {status === "streaming" && (
        <div className={`absolute top-4 z-10 ${topRightButton ? "right-16" : "right-4"}`}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={handleStop}
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content area */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center text-center max-w-4xl w-full mx-auto px-4",
          "min-h-96",
        )}
      >
        <AnimatePresence mode="wait">
          {status === "submitted" ? (
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
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic max-w-md">
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
                : lastAssistantMessage.parts?.map((part, index) =>
                    part.type === "text" ? (
                      <div key={index} className="whitespace-normal">
                        {part.text}
                      </div>
                    ) : part.type === "tool-invocation" ? (
                      <div key={index} className="mt-8 text-sm text-muted-foreground">
                        {t("processing")}
                      </div>
                    ) : null,
                  ) || lastAssistantMessage.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom input area - fixed to bottom */}
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-8 pt-0 relative">
        {/* Timer progress indicator */}
        {showTimer && (
          <div className="flex items-center justify-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            <div className="w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full h-0.5">
              <div
                className="bg-zinc-400 dark:bg-zinc-500 h-0.5 rounded-full transition-all duration-300"
                style={{ width: `${(1 - timeLeft / DEFAULT_TIME_LEFT) * 100}%` }}
              />
            </div>
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
        )}

        {/* Bottom buttons area */}
        <div className="flex items-center justify-center gap-4">
          {/* Record Button */}
          <RecordButton
            onTranscript={handleTranscriptInternal}
            onPartialTranscript={handlePartialTranscriptInternal}
            language={locale}
            disabled={status === "streaming" || status === "submitted"}
          />

          {/* Text Input Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            className={`rounded-full transition-all duration-200 w-10 h-10 flex items-center justify-center ${
              showTextInput
                ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200"
                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600"
            }`}
            onClick={() => setShowTextInput(!showTextInput)}
            disabled={status === "streaming" || status === "submitted"}
          >
            <Keyboard className="h-5 w-5" />
          </Button>
        </div>

        {/* Text Input Area - Only shown when toggled */}
        <AnimatePresence>
          {showTextInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.1 }}
              className="overflow-hidden mt-6"
            >
              <form
                onSubmit={handleSubmitWithFocus}
                className="relative flex items-center bg-white dark:bg-zinc-800 backdrop-blur-sm rounded-2xl p-2 w-full border border-zinc-200 dark:border-zinc-700"
              >
                <CustomTextarea
                  ref={textareaRef}
                  value={input}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  placeholder={t("shareThoughts")}
                  rows={1}
                  disabled={status === "streaming" || status === "submitted"}
                  className="flex min-h-[48px] w-full resize-none bg-transparent border-none
                  focus-visible:ring-0 focus-visible:ring-offset-0 outline-none
                  text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 py-3 px-3 max-h-32
                  text-base leading-relaxed overflow-hidden"
                  onKeyDown={(e) => {
                    if (
                      !isMobile &&
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
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
                  disabled={status === "streaming" || status === "submitted" || !input.trim()}
                  className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex-shrink-0 w-12 h-12 transition-colors"
                >
                  {status === "submitted" ? (
                    <Loader2Icon className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming transcript display - in bottom padding area */}
        <AnimatePresence>
          {partialTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 max-w-xs"
            >
              <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center truncate px-2">
                <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-pulse mr-1"></span>
                {partialTranscript.length > 30
                  ? `...${partialTranscript.slice(-30)}`
                  : partialTranscript}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
