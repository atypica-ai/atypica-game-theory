"use client";

import { prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useRef } from "react";

export interface UseFormatContentOptions {
  /**
   * Whether to force live generation (bypass cache)
   * - true: Always generate new content
   * - false: Try to use cached content first
   * Default: false
   */
  live?: boolean;
  onComplete?: (html: string) => void;
  onError?: (error: Error) => void;
}

export interface UseFormatContentResult {
  formattedHtml: string;
  isLoading: boolean;
  error: Error | null;
  formatContent: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * React hook for formatting content using the /api/format-content endpoint
 * Simplified version - backend handles all complexity (cache, processing wait, generation)
 */
export function useFormatContent(options: UseFormatContentOptions = {}): UseFormatContentResult {
  const { live = false, ...restOptions } = options;
  const optionsRef = useRef(restOptions);
  optionsRef.current = restOptions;

  // Build API URL with live query parameter
  const apiUrl = `/api/format-content${live ? "?live=true" : ""}`;

  const {
    messages,
    sendMessage,
    setMessages,
    stop,
    status,
    error: chatError,
  } = useChat({
    experimental_throttle: 3000,
    transport: new DefaultChatTransport({
      api: apiUrl,
      prepareSendMessagesRequest({ messages }) {
        const message = prepareLastUIMessageForRequest(messages);
        return {
          body: {
            message,
            userChatToken: "", // 其实不需要，但是现在 schema 里强制需要了，先留着
          },
        };
      },
    }),
    onFinish: ({ message }) => {
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("");
      optionsRef.current.onComplete?.(content);
    },
    onError: (error) => {
      optionsRef.current.onError?.(error);
    },
  });

  const formattedHtml = useMemo(() => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "assistant") {
      return lastMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("");
    }
    return "";
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  const formatContent = useCallback(
    async (content: string) => {
      // 防止并发调用：如果正在处理中，忽略新的调用
      if (status === "streaming" || status === "submitted") {
        return;
      }
      await sendMessage({ text: content });
    },
    [sendMessage, status],
  );

  const reset = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    formattedHtml,
    isLoading,
    error: chatError ?? null,
    formatContent,
    stop,
    reset,
  };
}
