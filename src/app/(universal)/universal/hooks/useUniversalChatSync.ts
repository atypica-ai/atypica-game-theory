"use client";

import { TUniversalMessageWithTool, UniversalToolName } from "@/app/(universal)/tools/types";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { getToolName, isToolUIPart } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUniversalUserChatByToken } from "../actions";

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
    return targetMessages
      .map((message) => {
        const parts = message.parts
          .map((part) => {
            if (!isToolUIPart(part)) return `${part.type}`;
            const toolName = getToolName(part);
            return `${part.type}:${toolName}:${part.state}:${part.toolCallId}`;
          })
          .join("|");
        return `${message.id}:${message.role}:${parts}`;
      })
      .join("||");
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
      timeoutId = setTimeout(poll, isDocumentVisible ? 5000 : 30000);
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
