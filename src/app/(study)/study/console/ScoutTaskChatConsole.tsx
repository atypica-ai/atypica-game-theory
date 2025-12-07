import { StudyUITools, ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import { fetchUserChatByToken, fetchUserChatStateByToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { ToolUIPart } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StreamSteps } from "./StreamSteps";

export const ScoutTaskChatConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<
    Pick<StudyUITools, ToolName.scoutTaskChat | ToolName.scoutSocialTrends>
  >;
}) => {
  const { studyUserChat, replay } = useStudyContext();
  const scoutUserChatToken = toolInvocation.input?.scoutUserChatToken;
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [backgroundToken, setBackgroundToken] = useState<string | null>(null);
  const backgroundRunning = useMemo(() => !!backgroundToken, [backgroundToken]);

  // Console 不做回放，直接显示完整内容
  const messagesDisplay = messages;

  const reloadMessages = useCallback(async () => {
    if (!scoutUserChatToken) return;
    const result = await fetchUserChatByToken(scoutUserChatToken, "scout");
    if (result.success) {
      setMessages(result.data.messages as TStudyMessageWithTool[]);
    } else {
      console.log(result.message);
    }
  }, [scoutUserChatToken]);

  // 使用 ref，确保 useCallback 里面取到最新值，并且变化了以后不触发 refreshStudyUserChat 和 useEffect 更新
  const chatUpdatedAt = useRef<number | null>(null);
  const refreshScoutUserChat = useCallback(async () => {
    if (!scoutUserChatToken) return;
    const result = await fetchUserChatStateByToken(scoutUserChatToken, "scout");
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
      // console.log(`ScoutTaskChat [${scoutUserChatToken}] updated at ${chatMessageUpdatedAt}, reloading messages`);
      reloadMessages();
    } else {
      // console.log(`ScoutTaskChat [${scoutUserChatToken}] no updates`);
    }
  }, [scoutUserChatToken, backgroundToken, reloadMessages]);

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    if (replay) {
      // 如果是 replay 就只取一次
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (window.document.hidden) {
        timeoutId = setTimeout(poll, 30000);
        return;
      }
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 refreshScoutUserChat 还没完成就不会 clearTimeout 了
      await refreshScoutUserChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshScoutUserChat, replay, reloadMessages, isDocumentVisible]);

  return (
    <div className="space-y-6 w-full">
      {messagesDisplay.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={scoutUserChatToken} />
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
          <span className="mr-2">Looking for target users </span>
          <span className="animate-bounce">✨ </span>
          {/* <span className="animate-bounce">·</span> */}
          {/* <span className="animate-bounce [animation-delay:0.2s]">·</span> */}
          {/* <span className="animate-bounce [animation-delay:0.4s]">·</span> */}
        </div>
      )}
    </div>
  );
};
