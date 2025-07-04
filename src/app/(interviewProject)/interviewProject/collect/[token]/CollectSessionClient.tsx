"use client";
import { ToolName } from "@/ai/tools/types";
import { CollectSessionBodySchema } from "@/app/(interviewProject)/api/chat/interviewSession/lib";
import { fetchCollectInterviewSession } from "@/app/(interviewProject)/interviewProject/actions";
import { RecordButton } from "@/components/chat/RecordButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, useDevice } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { generateId, Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Ear,
  Info,
  Keyboard,
  Loader2Icon,
  Send,
  Shield,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

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

const ProjectDetailsCard = ({
  interviewSession,
}: {
  interviewSession: ExtractServerActionData<typeof fetchCollectInterviewSession>;
}) => {
  const t = useTranslations("InterviewProject.collectSession");
  return (
    <Card className="overflow-hidden border-primary/20 py-0 h-full flex flex-col">
      <CardHeader className="bg-primary/5 pt-6 border-b border-primary/10">
        <CardTitle className="text-lg flex items-center">
          <span>{interviewSession.title}</span>
          <VerifyBadge type="verified" className="ml-2" />
        </CardTitle>
        <CardDescription>{interviewSession.project.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-muted-foreground mb-4">{interviewSession.project.brief}</p>
        <div className="space-y-4">
          <h3 className="font-medium mb-2">{t("researchObjectives")}</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
            {interviewSession.project.objectives.map((objective, i) => (
              <li key={i}>{objective}</li>
            ))}
          </ul>
        </div>
        <div className="mt-6 pt-4 border-t border-primary/10">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>{t("privacyNotice")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function VerifyBadge({ type, className }: { type: "verified" | "info"; className?: string }) {
  const t = useTranslations("InterviewProject.collectSession");
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        type === "verified"
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        className,
      )}
    >
      {type === "verified" ? (
        <>
          <BadgeCheck className="mr-1 h-3 w-3" />
          <span>{t("officialInterview")}</span>
        </>
      ) : (
        <>
          <Info className="mr-1 h-3 w-3" />
          <span>{t("information")}</span>
        </>
      )}
    </div>
  );
}

export function CollectSessionClient({
  interviewSession,
  initialMessages,
}: {
  interviewSession: ExtractServerActionData<typeof fetchCollectInterviewSession>;
  initialMessages?: Message[];
}) {
  const locale = useLocale();
  const { isMobile } = useDevice();
  const t = useTranslations("InterviewProject.collectSession");

  const [interviewCompleted, setInterviewCompleted] = useState(
    interviewSession.status === "completed",
  );
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<Message | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initialRequestBody = {
    sessionToken: interviewSession.token,
  };

  const useChatHelpers = useChat({
    api: "/api/chat/interviewSession/collect",
    experimental_throttle: 300,
    initialMessages: initialMessages || [],
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof CollectSessionBodySchema> = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
    },
    onToolCall({ toolCall }) {
      if (toolCall.toolName === ToolName.saveInterviewSessionSummary) {
        setInterviewCompleted(true);
      }
    },
  });

  const { messages, input, setInput, handleSubmit, status, stop } = useChatHelpers;
  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  // Determine interview state based on completion
  const interviewState = useMemo(() => {
    if (interviewCompleted) {
      return "completed";
    }
    return "active";
  }, [interviewCompleted]);

  // Get summary from messages
  const summary = useMemo(() => {
    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === ToolName.saveInterviewSessionSummary &&
            part.toolInvocation.state === "result"
          ) {
            return part.toolInvocation.args.summary || t("interviewCompleted");
          }
        }
      }
    }
    return "";
  }, [messages, t]);

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
      // Re-focus after a short delay to account for state updates
      setTimeout(() => {
        if (textareaRef.current && interviewState === "active" && showTextInput) {
          textareaRef.current.focus();
        }
      }, 50);
    },
    [handleSubmit, interviewState, input, showTextInput],
  );

  const handleTranscript = useCallback((text: string) => {
    if (text.trim()) {
      const messageToSend = {
        role: "user" as const,
        content: text,
        id: generateId(),
      };
      setLastUserMessage(messageToSend);
      useChatRef.current.append(messageToSend);
    }
  }, []);

  // Auto focus input after AI streaming ends
  useEffect(() => {
    if (status === "ready" && interviewState === "active" && textareaRef.current && showTextInput) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [status, interviewState, showTextInput]);

  // Auto focus input when text input is shown
  useEffect(() => {
    if (showTextInput && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [showTextInput]);

  // Initialize conversation
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (!initialMessages?.length) {
      useChatRef.current.append({ role: "user", content: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  const lastAssistantMessage = useMemo(() => {
    return messages.findLast((m) => m.role === "assistant");
  }, [messages]);

  // When a new assistant message is being generated, clear the last user message
  useEffect(() => {
    if (status === "streaming") {
      setLastUserMessage(null);
    }
  }, [status]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const chatWithAIArea = (
    <div className="w-full h-full flex flex-col relative bg-zinc-50 dark:bg-zinc-900 pb-8">
      {/* Top bar with language indicator and controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
          {locale === "zh-CN" ? "中文" : "English"}
        </div>
      </div>

      {/* Project info button */}
      <div className="absolute top-4 right-4 z-10">
        <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Info className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{t("projectDetails")}</DialogTitle>
              <DialogDescription>{t("projectDetailsDescription")}</DialogDescription>
            </DialogHeader>
            <ProjectDetailsCard interviewSession={interviewSession} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stop button when streaming */}
      {status === "streaming" && (
        <div className="absolute top-4 right-16 z-10">
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
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl w-full mx-auto px-4">
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
                : lastAssistantMessage.parts.map((part, index) =>
                    part.type === "text" ? (
                      <div key={index}>{part.text}</div>
                    ) : part.type === "tool-invocation" ? (
                      part.toolInvocation.toolName === ToolName.saveInterviewSessionSummary ? (
                        <div key={index} className="mt-8 text-sm text-muted-foreground">
                          {t("savingInterview")}
                        </div>
                      ) : (
                        <div key={index} className="mt-8 font-mono text-sm text-muted-foreground">
                          exec {part.toolInvocation.toolName}
                        </div>
                      )
                    ) : null,
                  )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom input area - fixed to bottom */}
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-8 pt-0 space-y-6">
        {/* Bottom buttons area */}
        <div className="flex items-center justify-center gap-4">
          {/* Record Button */}
          <RecordButton
            onTranscript={handleTranscript}
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
              className="overflow-hidden"
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
      </div>
    </div>
  );

  const completedInterviewArea = (
    <div className="w-full h-full flex flex-col relative bg-zinc-50 dark:bg-zinc-900">
      <div className="absolute top-4 right-4 z-10">
        <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Info className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{t("projectDetails")}</DialogTitle>
              <DialogDescription>{t("projectDetailsDescription")}</DialogDescription>
            </DialogHeader>
            <ProjectDetailsCard interviewSession={interviewSession} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-18">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-2xl text-zinc-900 dark:text-zinc-100 w-full"
        >
          <div className="bg-primary/20 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8">
            <ThumbsUpIcon className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-2xl font-EuclidCircularA font-medium mb-6">{t("thankYou")}</h1>

          <p className="text-zinc-600 dark:text-zinc-400 mb-8">{t("thankYouMessage")}</p>

          {summary && (
            <div className="max-h-96 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 p-6 rounded-lg text-left whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
              {summary}
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t py-2">
        <div className="flex flex-col items-center justify-between gap-4 md:h-10 md:flex-row px-4 lg:px-6">
          <div className="text-center text-xs leading-loose text-muted-foreground md:text-left">
            {t("builtWith")}{" "}
            <Link
              href="https://atypica.ai"
              target="_blank"
              className="font-medium underline underline-offset-4"
            >
              atypica.AI
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );

  return interviewState === "completed" ? completedInterviewArea : chatWithAIArea;
}
