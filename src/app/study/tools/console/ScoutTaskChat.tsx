import { fetchUserChatByToken, fetchUserChatStateByToken } from "@/app/study/actions";
import { useStudyContext } from "@/app/study/hooks/StudyContext";
import {
  consoleStreamWaitTime,
  useProgressiveMessages,
} from "@/app/study/hooks/useProgressiveMessages";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ToolName } from "@/tools";
import { Message, ToolInvocation } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StreamSteps } from "./StreamSteps";

const ScoutTaskChat = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  const scoutUserChatToken = toolInvocation.args.scoutUserChatToken as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [backgroundToken, setBackgroundToken] = useState<string | null>(null);
  const backgroundRunning = useMemo(() => !!backgroundToken, [backgroundToken]);

  const { replay } = useStudyContext();
  const { partialMessages: messagesDisplay } = useProgressiveMessages({
    uniqueId: `toolInvocation-${toolInvocation.toolCallId}`,
    messages: messages,
    enabled: replay,
    fixedDuration: consoleStreamWaitTime(ToolName.scoutTaskChat),
  });

  const reloadMessages = useCallback(async () => {
    const { messages } = await fetchUserChatByToken(scoutUserChatToken, "scout");
    setMessages(messages);
  }, [scoutUserChatToken]);

  // 使用 ref，确保 useCallback 里面取到最新值，并且变化了以后不触发 refreshStudyUserChat 和 useEffect 更新
  const chatUpdatedAt = useRef<number | null>(null);
  const fetchUpdate = useCallback(async () => {
    const { backgroundToken: newBackgroundToken, updatedAt } = await fetchUserChatStateByToken(
      scoutUserChatToken,
      "scout",
    );
    if (updatedAt.valueOf() !== chatUpdatedAt.current || newBackgroundToken !== backgroundToken) {
      chatUpdatedAt.current = updatedAt.valueOf();
      setBackgroundToken(newBackgroundToken);
      console.log(
        `ScoutTaskChat [${scoutUserChatToken}] updated at ${updatedAt}, reloading messages`,
      );
      reloadMessages();
    } else {
      console.log(`ScoutTaskChat [${scoutUserChatToken}] no updates`);
    }
  }, [scoutUserChatToken, backgroundToken, reloadMessages]);

  // 添加定时器效果
  useEffect(() => {
    if (replay) {
      // 如果是 replay 就只取一次
      reloadMessages();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 fetchUpdate 还没完成就不会 clearTimeout 了
      await fetchUpdate();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchUpdate, replay, reloadMessages]);

  return (
    <div className="space-y-6 w-full">
      {messagesDisplay.map((message) => (
        <StreamSteps
          key={`message-${message.id}`}
          avatar={{
            assistant: <HippyGhostAvatar seed={scoutUserChatToken} />,
          }}
          role={message.role}
          content={message.content}
          parts={message.parts}
        ></StreamSteps>
      ))}
      {(toolInvocation.state !== "result" || backgroundRunning) && (
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

export default ScoutTaskChat;
