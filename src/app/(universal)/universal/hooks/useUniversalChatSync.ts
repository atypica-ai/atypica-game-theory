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

  const [isRunning, setIsRunning] = useState(false);
  const chatUpdatedAt = useRef<number | null>(null);
  const { isDocumentVisible } = useDocumentVisibility();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const result = await fetchUserChatStateByTokenAction({
        userChatToken,
        kind: userChatKind,
      });
      if (!cancelled && result.success) {
        setIsRunning(result.data.isRunning);
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
    if (nextIsRunning === isRunning && chatMessageUpdatedAt.valueOf() === chatUpdatedAt.current) {
      return;
    }

    setIsRunning(nextIsRunning);
    chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();

    const chatResult = await fetchUniversalUserChatByToken(userChatToken);
    if (chatResult.success) {
      onSetMessages(chatResult.data.messages as TUniversalMessageWithTool[]);
    }
  }, [isRunning, onSetMessages, userChatKind, userChatToken]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!isRunning || hasPendingHumanInTheLoopTool || status !== "ready") return;
      timeoutId = setTimeout(poll, isDocumentVisible ? 5000 : 30000);
      await refreshUniversalChat();
    };

    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    hasPendingHumanInTheLoopTool,
    isDocumentVisible,
    isRunning,
    refreshUniversalChat,
    status,
  ]);
}
