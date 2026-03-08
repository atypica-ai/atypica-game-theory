"use client";

import { fetchUserChatByToken } from "@/app/(study)/study/actions";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { ToolUIPart } from "ai";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { StreamSteps } from "@/app/(study)/study/console/StreamSteps";

export function ScoutTaskChatExecutionView({
  toolInvocation,
  studyUserChatToken,
  polling = true,
  renderToolUIPart,
}: {
  toolInvocation: ToolUIPart<
    Pick<StudyUITools, StudyToolName.scoutTaskChat | StudyToolName.scoutSocialTrends>
  >;
  studyUserChatToken: string;
  polling?: boolean;
  renderToolUIPart: (toolPart: TStudyMessageWithTool["parts"][number]) => ReactNode;
}) {
  const scoutUserChatToken = toolInvocation.input?.scoutUserChatToken;
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const reloadMessages = useCallback(async () => {
    if (!scoutUserChatToken) return;
    const result = await fetchUserChatByToken(scoutUserChatToken, "scout");
    if (result.success) {
      setMessages(result.data.messages as TStudyMessageWithTool[]);
    }
  }, [scoutUserChatToken]);

  const chatUpdatedAt = useRef<number | null>(null);
  const refreshScoutUserChat = useCallback(async (): Promise<boolean> => {
    if (!scoutUserChatToken) return false;
    const result = await fetchUserChatStateByTokenAction({
      userChatToken: scoutUserChatToken,
      kind: "scout",
    });
    if (!result.success) {
      return true;
    }
    const { isRunning: newIsRunning, chatMessageUpdatedAt } = result.data;
    if (chatMessageUpdatedAt.valueOf() !== chatUpdatedAt.current || newIsRunning !== isRunning) {
      chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();
      setIsRunning(newIsRunning);
      reloadMessages();
    }
    return newIsRunning;
  }, [scoutUserChatToken, isRunning, reloadMessages]);

  useEffect(() => {
    if (!polling) {
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const shouldContinue = await refreshScoutUserChat();
      if (cancelled) return;
      if (shouldContinue) {
        timeoutId = setTimeout(poll, window.document.hidden ? 30000 : 5000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshScoutUserChat, polling, reloadMessages]);

  return (
    <div className="space-y-6 w-full">
      {messages.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={scoutUserChatToken} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={studyUserChatToken} />
            ) : undefined
          }
          message={message}
          renderToolUIPart={renderToolUIPart}
        />
      ))}
      {(toolInvocation.state === "input-streaming" ||
        toolInvocation.state === "input-available" ||
        isRunning) && (
        <div className="w-full flex py-4 gap-px items-center justify-start text-zinc-500 text-xs font-mono">
          <span className="mr-2">Looking for target users </span>
          <span className="animate-bounce">✨ </span>
        </div>
      )}
    </div>
  );
}
