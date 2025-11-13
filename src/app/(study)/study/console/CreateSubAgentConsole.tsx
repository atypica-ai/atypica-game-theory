import { StudyUITools, ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import { fetchUserChatByToken, fetchUserChatStateByToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import {
  consoleStreamWaitTime,
  useProgressiveMessages,
} from "@/app/(study)/study/hooks/useProgressiveMessages";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { ToolUIPart } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StreamSteps } from "./StreamSteps";

export const CreateSubAgentConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, ToolName.createSubAgent>>;
}) => {
  const { studyUserChat } = useStudyContext();
  const subAgentChatToken = toolInvocation.input?.subAgentChatToken;
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [backgroundToken, setBackgroundToken] = useState<string | null>(null);
  const backgroundRunning = useMemo(() => !!backgroundToken, [backgroundToken]);

  const { replay } = useStudyContext();
  const { partialMessages: messagesDisplay } = useProgressiveMessages({
    uniqueId: `toolInvocation-${toolInvocation.toolCallId}`,
    messages: messages,
    enabled: replay,
    fixedDuration: consoleStreamWaitTime(ToolName.createSubAgent),
  });

  const reloadMessages = useCallback(async () => {
    if (!subAgentChatToken) return;
    // createSubAgent uses "misc" kind
    const result = await fetchUserChatByToken(subAgentChatToken, "misc");
    if (result.success) {
      setMessages(result.data.messages as TStudyMessageWithTool[]);
    } else {
      console.log(result.message);
    }
  }, [subAgentChatToken]);

  // Use ref to ensure useCallback gets latest value without triggering updates
  const chatUpdatedAt = useRef<number | null>(null);
  const refreshSubAgentChat = useCallback(async () => {
    if (!subAgentChatToken) return;
    const result = await fetchUserChatStateByToken(subAgentChatToken, "misc");
    if (!result.success) {
      console.log(result.message);
      return;
    }
    const { backgroundToken: newBackgroundToken, chatMessageUpdatedAt } = result.data;
    if (
      chatMessageUpdatedAt.valueOf() !== chatUpdatedAt.current ||
      newBackgroundToken !== backgroundToken
    ) {
      chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();
      setBackgroundToken(newBackgroundToken);
      reloadMessages();
    }
  }, [subAgentChatToken, backgroundToken, reloadMessages]);

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    if (replay) {
      // If replay mode, only fetch once
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (window.document.hidden) {
        timeoutId = setTimeout(poll, 2000);
        return;
      }
      timeoutId = setTimeout(poll, 1000); // Poll every second when visible
      await refreshSubAgentChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshSubAgentChat, replay, reloadMessages, isDocumentVisible]);

  return (
    <div className="space-y-6 w-full">
      {messagesDisplay.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={subAgentChatToken} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={studyUserChat.token} />
            ) : undefined
          }
          message={message}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        ></StreamSteps>
      ))}
      {(toolInvocation.state === "input-streaming" ||
        toolInvocation.state === "input-available" ||
        backgroundRunning) && (
        <div className="w-full flex py-4 gap-px items-center justify-start text-zinc-500 text-xs font-mono">
          <span className="mr-2">Executing task</span>
          <span className="animate-bounce">✨</span>
        </div>
      )}
    </div>
  );
};
