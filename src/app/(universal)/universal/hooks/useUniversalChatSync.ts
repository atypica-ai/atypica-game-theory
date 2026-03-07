"use client";

import { TUniversalMessageWithTool, UniversalToolName } from "@/app/(universal)/tools/types";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { getToolName, isToolUIPart } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUniversalUserChatByToken } from "../actions";
import {
  UNIVERSAL_CHAT_SYNC_VISIBLE_POLL_INTERVAL_MS,
  UNIVERSAL_HIDDEN_POLL_INTERVAL_MS,
} from "../polling";

export function useUniversalChatSync({
  userChatToken,
  userChatKind,
  messages,
  status,
  onSetMessages,
}: {
  userChatToken: string;
  userChatKind: "universal" | "study";
  messages: TUniversalMessageWithTool[];
  status: string;
  onSetMessages: (messages: TUniversalMessageWithTool[]) => void;
}) {
  const hasPendingHumanInTheLoopTool = useMemo(
    () =>
      messages.some((message) =>
        message.parts.some((part) => {
          if (!isToolUIPart(part)) return false;
          const toolName = getToolName(part);
          const isHumanTool =
            toolName === UniversalToolName.requestSelectPersonas ||
            toolName === UniversalToolName.confirmPanelResearchPlan;
          if (!isHumanTool) return false;
          return part.state === "input-available" || part.state === "input-streaming";
        }),
      ),
    [messages],
  );
  const hasPendingSubAgentToken = useMemo(
    () =>
      messages.some((message) =>
        message.parts.some((part) => {
          if (!isToolUIPart(part)) return false;
          if (getToolName(part) !== UniversalToolName.createStudySubAgent) return false;
          if (part.state !== "output-available") return true;
          if (!part.output || typeof part.output !== "object") return true;
          const output = part.output as Record<string, unknown>;
          return typeof output.subAgentChatToken !== "string" || output.subAgentChatToken.length === 0;
        }),
      ),
    [messages],
  );

  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const chatUpdatedAt = useRef<number | null>(null);
  const { isDocumentVisible } = useDocumentVisibility();
  const messageSignatureRef = useRef("");

  const buildMessageSignature = useCallback((targetMessages: TUniversalMessageWithTool[]) => {
    // Only serialize the last few messages in detail to avoid O(n) JSON.stringify on long conversations.
    // Earlier messages are identified by id+role+partCount which is sufficient for change detection.
    const DETAILED_TAIL = 6;
    const totalCount = targetMessages.length;

    const clip = (value: string, max: number) =>
      value.length > max ? `${value.slice(0, max)}...` : value;

    const stableSerialize = (value: unknown, max: number) => {
      if (value === undefined || value === null) return "";
      try {
        return clip(JSON.stringify(value), max);
      } catch {
        return clip(String(value), max);
      }
    };

    const detailSignature = (message: TUniversalMessageWithTool) => {
      const parts = message.parts
        .map((part) => {
          if (!isToolUIPart(part)) {
            if (part.type === "text" || part.type === "reasoning") {
              return `${part.type}:${part.state}:${clip(part.text, 280)}`;
            }
            return `${part.type}`;
          }
          const toolName = getToolName(part);
          return [
            part.type,
            toolName,
            part.state,
            part.toolCallId,
            stableSerialize(part.input, 240),
            stableSerialize(part.output, 280),
            clip(part.errorText ?? "", 160),
          ].join(":");
        })
        .join("|");
      return `${message.id}:${message.role}:${parts}`;
    };

    const headSummaries = targetMessages
      .slice(0, Math.max(0, totalCount - DETAILED_TAIL))
      .map((m) => `${m.id}:${m.role}:${m.parts.length}`);
    const tailDetails = targetMessages
      .slice(Math.max(0, totalCount - DETAILED_TAIL))
      .map(detailSignature);

    return `${totalCount}::${headSummaries.join("|")}||${tailDetails.join("||")}`;
  }, []);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    messageSignatureRef.current = buildMessageSignature(messages);
  }, [buildMessageSignature, messages]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const result = await fetchUserChatStateByTokenAction({
        userChatToken,
        kind: userChatKind,
      });
      if (!cancelled && result.success) {
        setIsRunning(result.data.isRunning);
        isRunningRef.current = result.data.isRunning;
        chatUpdatedAt.current = result.data.chatMessageUpdatedAt.valueOf();
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [userChatKind, userChatToken]);

  const refreshUniversalChat = useCallback(async () => {
    const stateResult = await fetchUserChatStateByTokenAction({
      userChatToken,
      kind: userChatKind,
    });
    if (!stateResult.success) return;

    const { isRunning: nextIsRunning, chatMessageUpdatedAt } = stateResult.data;
    if (
      nextIsRunning === isRunningRef.current &&
      chatMessageUpdatedAt.valueOf() === chatUpdatedAt.current &&
      !hasPendingSubAgentToken
    ) {
      return;
    }

    if (nextIsRunning !== isRunningRef.current) {
      setIsRunning(nextIsRunning);
      isRunningRef.current = nextIsRunning;
    }
    chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();

    const chatResult = await fetchUniversalUserChatByToken(userChatToken);
    if (chatResult.success) {
      const nextMessages = chatResult.data.messages as TUniversalMessageWithTool[];
      const nextSignature = buildMessageSignature(nextMessages);
      if (nextSignature !== messageSignatureRef.current) {
        messageSignatureRef.current = nextSignature;
        onSetMessages(nextMessages);
      }
    }
  }, [buildMessageSignature, hasPendingSubAgentToken, onSetMessages, userChatKind, userChatToken]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if ((!isRunningRef.current && !hasPendingSubAgentToken) || hasPendingHumanInTheLoopTool || status !== "ready") {
        return;
      }
      await refreshUniversalChat();
      timeoutId = setTimeout(
        poll,
        isDocumentVisible
          ? UNIVERSAL_CHAT_SYNC_VISIBLE_POLL_INTERVAL_MS
          : UNIVERSAL_HIDDEN_POLL_INTERVAL_MS,
      );
    };

    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    hasPendingHumanInTheLoopTool,
    hasPendingSubAgentToken,
    isDocumentVisible,
    refreshUniversalChat,
    status,
  ]);
}
