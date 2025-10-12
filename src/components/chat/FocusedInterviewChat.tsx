"use client";

import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { correctSpeechText } from "@/app/api/transcribe/actions";
import { RecordButton } from "@/components/chat/RecordButton";
import { TypewriterText } from "@/components/chat/TypewriterText";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { useDevice } from "@/hooks/use-device";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, Ear, Keyboard, Loader2Icon, Send, XIcon } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
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

export function FocusedInterviewChat<
  T extends TMessageWithPlainTextTool = TMessageWithPlainTextTool,
>({
  locale,
  useChatHelpers: { messages, status, stop },
  useChatRef,
  showTimer = true,
  topRightButton,
  className = "",
}: {
  locale: Locale;
  useChatHelpers: Pick<ReturnType<typeof useChat<T>>, "messages" | "status" | "stop">;
  useChatRef: React.RefObject<
    Pick<ReturnType<typeof useChat<T>>, "regenerate" | "setMessages" | "sendMessage">
  >;
  showTimer?: boolean;
  topRightButton?: React.ReactNode;
  className?: string;
}) {
  // const locale = useLocale();
  const { isMobile } = useDevice();
  const t = useTranslations("Components.FocusedInterviewChat");
  const tCompliance = useTranslations("AICompliance");

  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LEFT);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastUserMessage, setLastUserMessage] = useState<{ content: string } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);

  const { isDocumentVisible } = useDocumentVisibility();

  const [input, setInput] = useState("");
  // Enhanced handleSubmit with refocus
  const handleSubmitWithFocus = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const messageContent = input.trim();
      if (!messageContent) return;
      setLastUserMessage({ content: messageContent });

      useChatRef.current.sendMessage({ text: messageContent });
      setInput("");
      if (textareaRef.current) {
        // 回复 textarea 的高度
        textareaRef.current.style.height = "auto";
      }

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
    [input, showTextInput, useChatRef],
  );

  const handleTranscriptInternal = useCallback(
    async (text: string) => {
      console.log("🎯 Final transcript received in FocusedInterviewChat:", text);
      if (text.trim()) {
        setIsProcessingTranscript(true);
        setPartialTranscript(""); // Clear partial transcript immediately

        try {
          // Extract context from last 2 messages (recent conversation round)
          const recentContext = messages
            .slice(-2)
            .map((message) =>
              message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n"),
            )
            .join("\n");

          console.log("📝 Correcting speech text with context:", {
            originalText: text,
            contextLength: recentContext.length,
          });

          // Apply speech correction
          const correctedText = await correctSpeechText(text, recentContext || undefined);
          console.log("✨ Speech correction result:", {
            original: text,
            corrected: correctedText,
          });

          setLastUserMessage({ content: correctedText });

          console.log("📨 Sending corrected transcript message to chat:", correctedText);
          useChatRef.current.sendMessage({ text: correctedText });

          // Reset timeout state when user responds
          setHasTimedOut(false);
          setTimeLeft(DEFAULT_TIME_LEFT);
          setIsTimerActive(false);
          console.log("✅ Transcript processing completed, chat updated");
        } finally {
          setIsProcessingTranscript(false);
        }
      }
    },
    [useChatRef, messages],
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

  // streaming 显示的时候，样式变化体验不好，字在乱跳，先固定样式 text-base sm:text-lg
  // const messageDisplayStyle = useMemo(() => {
  //   const textContent = lastAssistantMessage?.parts
  //     ?.map((part) => (part.type === "text" ? part.text : ""))
  //     .join("\n");
  //   const displayWidth = textContent ? getDisplayWidth(textContent) : 0;
  //   const threshold = isMobile ? 40 : 120;
  //   return cn({
  //     "text-xl sm:text-2xl": displayWidth < 60,
  //     "text-lg sm:text-xl": displayWidth >= 60 && displayWidth < 120,
  //     "text-base sm:text-lg": displayWidth >= 120,
  //     "text-center": displayWidth <= threshold,
  //     "text-left": displayWidth > threshold,
  //   });
  // }, [lastAssistantMessage?.parts, isMobile]);

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
      useChatRef.current.sendMessage({ text: "[USER_HESITATED]" });
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
        "flex-1 overflow-hidden",
        className,
      )}
    >
      {/* Top bar with language indicator and controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded",
            "bg-background/30 backdrop-blur-md",
          )}
        >
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
          "flex-1 overflow-scroll scrollbar-thin p-4",
          // "min-h-96",
        )}
      >
        <AnimatePresence mode="wait">
          {status === "submitted" || isProcessingTranscript ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-full flex flex-col items-center justify-center gap-4 text-zinc-600 dark:text-zinc-400"
            >
              <div className="flex items-center gap-2">
                <Ear className="w-4 h-4 text-primary" />
                <span>{isProcessingTranscript ? t("processing") : t("thinking")}</span>
              </div>
              {lastUserMessage && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic max-w-md">
                  &quot;{lastUserMessage.content}&quot;
                </p>
              )}
            </motion.div>
          ) : !lastAssistantMessage ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-full flex items-center justify-center text-base sm:text-lg text-center"
            >
              {t("gettingReady")}
            </motion.div>
          ) : (
            <motion.div
              key={lastAssistantMessage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className={cn(
                "font-EuclidCircularA font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed",
                "min-h-full flex flex-col items-center justify-center max-w-4xl w-full mx-auto",
                "text-base sm:text-lg text-center",
              )}
            >
              {(lastAssistantMessage.parts ?? []).map((part, index) => {
                // 只显示最后一个 part
                if (index < lastAssistantMessage.parts.length - 1) {
                  return null;
                }

                if (part.type === "text") {
                  // Show tool-related text parts without typewriter effect
                  if (index < lastAssistantMessage.parts.length - 1) {
                    return (
                      <div
                        key={index}
                        className={cn("mx-4 text-sm font-normal text-muted-foreground/50")}
                      >
                        {part.text}
                      </div>
                    );
                  }
                  // Apply typewriter effect only to the last text part
                  return <TypewriterText key={index} text={part.text} />;
                }

                if (part.type === "dynamic-tool") {
                  return (
                    <div
                      key={index}
                      className="my-4 text-sm text-center text-muted-foreground/50 font-normal font-mono"
                    >
                      {t("toolCalling")} {part.toolName}
                      {part.state === "output-available" ? (
                        <CheckIcon className="size-3 inline-block ml-2 text-green-500" />
                      ) : null}
                    </div>
                  );
                }

                if (isToolUIPart(part)) {
                  return (
                    <div
                      key={index}
                      className="my-4 text-sm text-center text-muted-foreground/50 font-normal font-mono"
                    >
                      {t("toolCalling")} {getToolName(part)}
                      {part.state === "output-available" ? (
                        <CheckIcon className="size-3 inline-block ml-2 text-green-500" />
                      ) : null}
                    </div>
                  );
                }

                return null;
              })}

              {status === "streaming" && <LoadingPulse className="mt-4 text-muted-foreground" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Bottom input area - fixed to bottom */}
      <div className="shrink-0 w-full max-w-3xl mx-auto px-4 pt-4 sm:px-8 relative space-y-3">
        {/* Timer progress indicator */}
        {showTimer && (
          <div
            className={cn(
              // "absolute top-1 left-1/2 -translate-x-1/2",
              "flex items-center justify-center gap-3 text-xs text-zinc-400 dark:text-zinc-500",
            )}
          >
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
            disabled={status === "streaming" || status === "submitted" || isProcessingTranscript}
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
            disabled={status === "streaming" || status === "submitted" || isProcessingTranscript}
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
              className="overflow-hidden"
            >
              <form
                onSubmit={handleSubmitWithFocus}
                className="relative flex items-center bg-white dark:bg-zinc-800 backdrop-blur-sm rounded-sm p-2 w-full border border-zinc-200 dark:border-zinc-700"
              >
                <CustomTextarea
                  ref={textareaRef}
                  value={input}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  placeholder={t("shareThoughts")}
                  rows={1}
                  disabled={
                    status === "streaming" || status === "submitted" || isProcessingTranscript
                  }
                  className={cn(
                    "flex w-full resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none",
                    "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                    "py-1 pl-2 pr-1 max-h-32 text-base leading-relaxed overflow-hidden",
                    "text-[15px] md:text-[15px] placeholder:text-[15px]", // 15px 可以让页面不自动放大
                  )}
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
                  disabled={
                    status === "streaming" ||
                    status === "submitted" ||
                    isProcessingTranscript ||
                    !input.trim()
                  }
                >
                  {status === "submitted" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
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
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 max-w-xs"
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

      <div
        className={cn(
          "absolute -bottom-2.5 left-1/2 -translate-x-1/2",
          "w-full text-xs text-center font-normal text-zinc-400 dark:text-zinc-600 px-4 my-4",
        )}
      >
        {tCompliance("shortDisclaimer")}
      </div>
    </div>
  );
}
