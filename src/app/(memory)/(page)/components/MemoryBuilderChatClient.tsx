"use client";

import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { TContextBuilderUITools } from "@/app/(memory)/tools/endInterview/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type CONTEXT_BUILDER_UI_MESSAGE = TMessageWithPlainTextTool<
  TContextBuilderUITools,
  ClientMessagePayload["message"]["metadata"]
>;

export function MemoryBuilderChatClient({
  mode,
  userChatToken,
  initialMessages = [],
  onSaveMemory,
}: {
  mode: "team" | "user";
  userChatToken: string;
  initialMessages?: CONTEXT_BUILDER_UI_MESSAGE[];
  onSaveMemory: (content: string) => Promise<{ success: boolean; message?: string }>;
}) {
  const locale = useLocale();
  const apiEndpoint =
    mode === "team" ? "/api/team-memory-builder/chat" : "/api/user-memory-builder/chat";

  const extraRequestPayload = useMemo(() => ({ userChatToken }), [userChatToken]);

  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport<CONTEXT_BUILDER_UI_MESSAGE>({
      api: apiEndpoint,
      prepareSendMessagesRequest({ messages, id }) {
        const message = prepareLastUIMessageForRequest(messages);
        const body: ClientMessagePayload = {
          id,
          message,
          ...extraRequestPayload,
        };
        return { body };
      },
    }),
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const { messages } = useChatHelpers;

  const interviewState = useMemo(() => {
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) => part.type === "tool-endInterview" && part.state === "output-available",
      ),
    );
    return hasEndInterviewResult ? "completed" : "active";
  }, [messages]);

  const { memory, recommendTopics } = useMemo(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (part.type === "tool-endInterview" && part.state === "output-available") {
          return {
            memory: part.input.memory,
            recommendTopics: part.input.recommendTopics ?? [],
          };
        }
      }
    }
    return { memory: "", recommendTopics: [] as string[] };
  }, [messages]);

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      useChatRef.current.sendMessage({ text: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.regenerate();
    }
  }, [initialMessages]);

  const router = useRouter();
  const tKey = mode === "team" ? "Team.MemoryBuilder.chatPage" : "User.MemoryBuilder.chatPage";
  const t = useTranslations(tKey);
  const [editedMemory, setEditedMemory] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const memoryInitializedRef = useRef(false);

  useEffect(() => {
    if (interviewState === "completed" && !memoryInitializedRef.current && memory) {
      setEditedMemory(memory);
      memoryInitializedRef.current = true;
    }
  }, [interviewState, memory]);

  const handleConfirm = useCallback(async () => {
    setIsSaving(true);
    if (editedMemory !== memory) {
      try {
        const result = await onSaveMemory(editedMemory);
        if (!result.success) {
          toast.error(t("saveFailed"), { description: result.message });
          setIsSaving(false);
          return;
        }
      } catch {
        toast.error(t("unexpectedError"));
        setIsSaving(false);
        return;
      }
    }
    if (recommendTopics.length > 0) {
      setShowSuggestions(true);
    } else {
      router.push("/newstudy");
    }
  }, [editedMemory, memory, onSaveMemory, recommendTopics, router, t]);

  const chatArea = (
    <FitToViewport>
      <FocusedInterviewChat<CONTEXT_BUILDER_UI_MESSAGE>
        locale={locale}
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={true}
        className="h-full"
      />
    </FitToViewport>
  );

  const memoryArea = (
    <FitToViewport>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-left max-w-4xl mx-auto w-full px-6 py-12 flex flex-col h-full"
      >
        <div className="shrink-0 space-y-2 mb-6">
          <h1 className="text-3xl md:text-4xl font-EuclidCircularA font-medium text-center tracking-tight">
            {t("profileTitle")}
          </h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
            {t("editHint")}
          </div>
        </div>

        <div className="flex-1 min-h-[40vh] relative flex flex-col">
          <Textarea
            value={editedMemory}
            onChange={(e) => setEditedMemory(e.target.value)}
            disabled={isSaving}
            className="flex-1 resize-none bg-muted p-6 rounded-2xl text-sm font-mono whitespace-pre-wrap leading-relaxed shadow-sm h-full"
            placeholder={t("memoryPlaceholder")}
          />
        </div>

        <div className="shrink-0 mt-8 flex justify-center">
          <Button
            onClick={handleConfirm}
            disabled={isSaving}
            size="lg"
            className="px-10 rounded-full"
          >
            {isSaving ? t("savingButton") : t("confirmButton")}
          </Button>
        </div>
      </motion.div>
    </FitToViewport>
  );

  const suggestionsArea = (
    <FitToViewport>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto w-full px-6 py-24 md:py-40 space-y-8"
      >
        <div className="space-y-4">
          <div className="w-12 h-1 bg-ghost-green" />
          <h1 className="text-3xl md:text-4xl font-EuclidCircularA font-medium tracking-tight">
            {t("suggestionsTitle")}
          </h1>
          <p className="text-base text-muted-foreground">{t("suggestionsSubtitle")}</p>
        </div>

        <div className="space-y-3">
          {recommendTopics.map((topic, index) => (
            <motion.button
              key={`topic-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.06 }}
              onClick={() => router.push(`/newstudy?brief=${encodeURIComponent(topic)}`)}
              className={cn(
                "group w-full text-left p-4 rounded-lg border border-border",
                "hover:border-foreground/20 transition-all duration-200",
                "flex items-center justify-between gap-4",
              )}
            >
              <span className="text-sm font-medium">{topic}</span>
              <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          ))}

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + recommendTopics.length * 0.06 }}
            onClick={() => router.push("/newstudy")}
            className={cn(
              "group w-full text-left p-4 rounded-lg border border-dashed border-border",
              "hover:border-foreground/20 transition-all duration-200",
              "flex items-center gap-3",
            )}
          >
            <div className="size-6 rounded-full border border-border flex items-center justify-center shrink-0">
              <PlusIcon className="size-3 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">{t("suggestionsNewTopic")}</span>
          </motion.button>
        </div>
      </motion.div>
    </FitToViewport>
  );

  if (interviewState === "active") return chatArea;
  if (showSuggestions) return suggestionsArea;
  return memoryArea;
}
