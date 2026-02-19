import { fetchUserChatByToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { ToolUIPart } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreamSteps } from "./StreamSteps";

export const CreateSubAgentConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.createSubAgent>>;
}) => {
  const { studyUserChat } = useStudyContext();
  const subAgentChatToken = toolInvocation.input?.subAgentChatToken;
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const { replay } = useStudyContext();
  // Console 不做回放，直接显示完整内容
  const messagesDisplay = messages;

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
    const result = await fetchUserChatStateByTokenAction({
      userChatToken: subAgentChatToken,
      kind: "misc",
    });
    if (!result.success) {
      console.log(result.message);
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
    if (replay) {
      // If replay mode, only fetch once
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (window.document.hidden) {
        timeoutId = setTimeout(poll, 30000);
        return;
      }
      timeoutId = setTimeout(poll, 5000); // Poll every second when visible
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
        isRunning) && (
        <div className="w-full flex py-4 gap-px items-center justify-start text-zinc-500 text-xs font-mono">
          <span className="mr-2">Executing task</span>
          <span className="animate-bounce">✨</span>
        </div>
      )}
    </div>
  );
};
