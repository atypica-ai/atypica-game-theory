"use client";

import { fetchUserChatByToken } from "@/app/(study)/study/actions";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { ToolUIPart } from "ai";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { StreamSteps } from "@/app/(study)/study/console/StreamSteps";

export function CreateSubAgentExecutionView({
  toolInvocation,
  parentChatToken,
  polling = true,
  renderToolUIPart,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.createSubAgent>>;
  parentChatToken: string;
  polling?: boolean;
  renderToolUIPart: (toolPart: TStudyMessageWithTool["parts"][number]) => ReactNode;
}) {
  const subAgentChatToken = toolInvocation.input?.subAgentChatToken;
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const reloadMessages = useCallback(async () => {
    if (!subAgentChatToken) return;
    const result = await fetchUserChatByToken(subAgentChatToken, "misc");
    if (result.success) {
      setMessages(result.data.messages as TStudyMessageWithTool[]);
    }
  }, [subAgentChatToken]);

  const chatUpdatedAt = useRef<number | null>(null);
  const refreshSubAgentChat = useCallback(async () => {
    if (!subAgentChatToken) return;
    const result = await fetchUserChatStateByTokenAction({
      userChatToken: subAgentChatToken,
      kind: "misc",
    });
    if (!result.success) {
      return;
    }
    const { isRunning: newIsRunning, chatMessageUpdatedAt } = result.data;
    if (chatMessageUpdatedAt.valueOf() !== chatUpdatedAt.current || newIsRunning !== isRunning) {
      chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();
      setIsRunning(newIsRunning);
      reloadMessages();
    }
  }, [subAgentChatToken, isRunning, reloadMessages]);

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    if (!polling) {
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (window.document.hidden) {
        timeoutId = setTimeout(poll, 30000);
        return;
      }
      timeoutId = setTimeout(poll, 5000);
      await refreshSubAgentChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshSubAgentChat, polling, reloadMessages, isDocumentVisible]);

  return (
    <div className="space-y-6 w-full">
      {messages.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={subAgentChatToken} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={parentChatToken} />
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
          <span className="mr-2">Executing task</span>
          <span className="animate-bounce">✨</span>
        </div>
      )}
    </div>
  );
}
