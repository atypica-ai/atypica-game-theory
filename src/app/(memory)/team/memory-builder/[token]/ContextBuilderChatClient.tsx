"use client";

import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { TContextBuilderUITools } from "@/app/(memory)/team/memory-builder/tools/types";
import { saveTeamMemoryAction } from "@/app/team/(detail)/capabilities/actions";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type CONTEXT_BUILDER_UI_MESSAGE = TMessageWithPlainTextTool<
  TContextBuilderUITools,
  ClientMessagePayload["message"]["metadata"]
>;

export function ContextBuilderChatClient({
  userChatToken,
  initialMessages = [],
}: {
  userChatToken: string;
  initialMessages?: CONTEXT_BUILDER_UI_MESSAGE[];
}) {
  const locale = useLocale();

  const extraRequestPayload = useMemo(() => ({ userChatToken }), [userChatToken]);

  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport<CONTEXT_BUILDER_UI_MESSAGE>({
      api: "/api/team-memory-builder/chat",
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

  // Determine interview state based on messages content
  const interviewState = useMemo(() => {
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) => part.type === "tool-endInterview" && part.state === "output-available",
      ),
    );
    if (hasEndInterviewResult) {
      return "completed";
    }
    return "active";
  }, [messages]);

  // Extract memory from endInterview tool result
  const memory = useMemo(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (part.type === "tool-endInterview" && part.state === "output-available") {
          return part.input.memory;
        }
      }
    }
    return "";
  }, [messages]);

  // Automatically start the conversation when the component mounts.
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
  const t = useTranslations("Team.MemoryBuilder.chatPage");
  const [editedMemory, setEditedMemory] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
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
        const result = await saveTeamMemoryAction({
          content: editedMemory,
        });
        if (!result.success) {
          toast.error(t("saveFailed"), {
            description: result.message,
          });
          setIsSaving(false);
          return;
        }
      } catch {
        toast.error(t("unexpectedError"));
        setIsSaving(false);
        return;
      }
    }
    router.push("/newstudy");
  }, [editedMemory, memory, router, t]);

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

  return interviewState === "completed" ? memoryArea : chatArea;
}
