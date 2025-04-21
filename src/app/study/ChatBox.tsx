import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { clearStudyUserChatBackgroundToken } from "@/data/UserChat";
import { getUserTokensBalance } from "@/data/UserTokens";
import { cn } from "@/lib/utils";
import { ToolName } from "@/tools";
import { Message, useChat } from "@ai-sdk/react";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUserChatByToken, fetchUserChatStateByToken } from "./actions";
import { NerdStats } from "./components/NerdStats";
import { CancelButton, StatusDisplay } from "./components/StatusDisplay";
import { useStudyContext } from "./hooks/StudyContext";
import { SingleMessage } from "./SingleMessage";

function popLastUserMessage(messages: Message[]) {
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    // pop 会修改 messages，导致调用 popLastUserMessage 的 currentChat 产生 state 变化，会有问题
    // const lastUserMessage = messages.pop();
    return { messages: messages.slice(0, -1), lastUserMessage: messages[messages.length - 1] };
  } else {
    return { messages, lastUserMessage: null };
  }
}

export function ChatBox() {
  // 这个组件是不支持对话直接切换的，如果切换，需要刷新页面重新加载！);
  const t = useTranslations("StudyPage.ChatBox");
  const {
    studyUserChat: {
      id: studyUserChatId,
      token: studyUserChatToken,
      messages: initialMessages,
      backgroundToken: initialBackgroundToken,
    },
  } = useStudyContext();

  const chatRequestBody = useMemo(() => ({}), []); // 现在用不到了，之前用于区分是不是 hello chat
  const {
    messages,
    setMessages,
    error,
    handleSubmit,
    input,
    setInput,
    status: useChatStatus,
    reload,
    addToolResult,
  } = useChat({
    id: studyUserChatId.toString(),
    initialMessages: initialMessages,
    sendExtraMessageFields: true, // send id and createdAt for each message
    api: "/api/chat/study",
    maxSteps: 15,
    body: chatRequestBody,
    // see https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#sending-only-the-last-message
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      // requestBody 这个字段不靠谱，虽然上面配置了 body，首次提交的时候这里的 requestBody 却是空的
      // 只好专门修复下
      const body = { ...chatRequestBody, ...requestBody };
      return { message: messages[messages.length - 1], id, ...body };
    },
  });

  const [backgroundToken, setBackgroundToken] = useState<string | null>(initialBackgroundToken);
  const useChatRef = useRef({ reload, setMessages });

  // React 在 development 模式下默认会执行两次 useEffect，这是 React 的严格模式的有意设计，帮助发现副作用
  // 两次请求会触发争夺 backgroundToken 冲突，需要阻止
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    // 如果最初最后一条消息是用户消息，则立即开始聊天，但如果 backgroundToken 不为空，不要发起聊天
    const { lastUserMessage } = popLastUserMessage(initialMessages);
    if (lastUserMessage && !backgroundToken) {
      useChatRef.current.reload();
    }
  }, [initialMessages, backgroundToken]);

  // 不知什么原因有时候会触发两次提交，这样就会导致 backgroundToken 被立即重置从而报错，所以加一个 2s throttle
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const handleSubmitMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const now = Date.now();
      if (now - lastSubmitTime < 2000) {
        console.log("Throttled form submission");
        return;
      }
      setLastSubmitTime(now);
      handleSubmit(event, {
        body: chatRequestBody,
      });
    },
    // handleSubmit 不能用 ref，要监听变化
    [handleSubmit, lastSubmitTime, chatRequestBody],
  );

  // const [chatUpdatedAt, setChatUpdatedAt] = useState<Date | null>(null);
  // 使用 ref，确保 useCallback 里面取到最新值，并且变化了以后不触发 refreshStudyUserChat 和 useEffect 更新
  const chatUpdatedAt = useRef<number | null>(null);
  const [maybeEvicted, setMaybeEvicted] = useState(false);
  const refreshStudyUserChat = useCallback(async () => {
    if (!backgroundToken) {
      // 在 background 状态时定期刷新
      return;
    }
    const result = await fetchUserChatStateByToken(studyUserChatToken, "study");
    if (!result.success) {
      console.error(result.message);
      return;
    }
    const { backgroundToken: newBackgroundToken, chatMessageUpdatedAt } = result.data;
    if (newBackgroundToken && chatUpdatedAt.current) {
      // 因为一些原因，backgroundToken 还在，但实际已经 30 分钟没更新 chat 了，则提示用户取消
      const elapsedMillis = Date.now() - chatUpdatedAt.current;
      if (elapsedMillis > 1000 * 60 * 30) {
        setMaybeEvicted(true);
      }
    }
    if (
      chatMessageUpdatedAt.valueOf() !== chatUpdatedAt.current ||
      newBackgroundToken !== backgroundToken
    ) {
      chatUpdatedAt.current = chatMessageUpdatedAt.valueOf();
      setBackgroundToken(newBackgroundToken);
      console.log(
        `StudyUserChat [${studyUserChatId}] updated at ${chatMessageUpdatedAt}, reloading messages`,
      );
      fetchUserChatByToken(studyUserChatToken, "study").then((result) => {
        if (result.success) {
          useChatRef.current.setMessages(result.data.messages);
        } else {
          console.error(result.message);
        }
      });
    } else {
      console.log(`StudyUserChat [${studyUserChatId}] no updates`);
    }
  }, [studyUserChatId, studyUserChatToken, backgroundToken]);

  const [userTokensBalance, setUserTokensBalance] = useState<number | null>(null);
  const updateUserBalance = useCallback(() => {
    getUserTokensBalance().then((result) => {
      if (result.success) {
        setUserTokensBalance(result.data);
      } else {
        console.error(result.message);
      }
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      updateUserBalance();
      await refreshStudyUserChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshStudyUserChat, updateUserBalance]);

  const waitForUser = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.parts) {
      const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
      if (
        lastPart.type === "tool-invocation" &&
        lastPart.toolInvocation.state !== "result" &&
        [ToolName.thanks, ToolName.requestInteraction].includes(
          lastPart.toolInvocation.toolName as ToolName,
        )
      ) {
        return true;
      }
    }
    return false;
  }, [messages]);

  const uiStatus = useMemo(
    () =>
      backgroundToken
        ? "background"
        : useChatStatus === "streaming"
          ? "streaming"
          : useChatStatus === "submitted"
            ? "submitted"
            : userTokensBalance !== null && userTokensBalance <= 0
              ? "outOfQuota"
              : waitForUser
                ? "waitForUser"
                : useChatStatus,
    // waitForUser 是对 useChatStatus 的补充，如果已经是 background, streaming 和 submitted 状态，则忽略 waitForUser
    [backgroundToken, userTokensBalance, useChatStatus, waitForUser],
  );
  const inputDisabled =
    uiStatus === "background" ||
    uiStatus === "streaming" ||
    uiStatus === "submitted" ||
    uiStatus === "outOfQuota" ||
    uiStatus === "waitForUser";
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <>
      <div
        ref={messagesContainerRef}
        className={cn(
          "flex-1 flex flex-col pb-12 gap-4 w-full items-center overflow-y-auto scrollbar-thin",
          "p-4",
        )}
      >
        {messages.map((message, index) => (
          <SingleMessage
            key={message.id}
            message={message}
            nickname={message.role === "assistant" ? "atypica.AI" : undefined}
            addToolResult={addToolResult}
            avatar={{ assistant: <HippyGhostAvatar seed={studyUserChatToken} /> }}
            // TODO: 目前先禁用这个功能
            // onDelete={
            //   message.role === "user" && index >= messages.length - 2
            //     ? async () => {
            //         // TODO 这里要改一下
            //         // assistant 可能连续出现 2 条，所以最后一条用户消息的index就不一定是 messages.length - 2
            //         // 如果删除，那也就不是一条 user 和一条 assistant，而应该是连续的 assistant 都删除
            //         const result = await deleteMessageFromUserChat(studyUserChatId, message.id);
            //         if (result.success) {
            //           setMessages(result.data);
            //         } else {
            //           console.error(result.message);
            //         }
            //       }
            //     : undefined
            // }
            isLastMessage={index === messages.length - 1}
          ></SingleMessage>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative mx-4">
        {error && (
          <div className="text-destructive text-xs mx-32 mb-2 line-clamp-1 text-center">
            {error?.message?.toString() || error.toString()}
          </div>
        )}
        <StatusDisplay status={uiStatus} backgroundToken={backgroundToken} />
        <div className="absolute right-0 -bottom-1">
          <NerdStats />
        </div>
      </div>

      <form onSubmit={handleSubmitMessage} className="relative mx-4">
        <Textarea
          className={cn(
            "block min-h-24 max-lg:min-h-20 text-sm placeholder:text-sm resize-none focus-visible:border-primary/70 transition-colors rounded-lg py-3 px-4",
            inputDisabled ? "opacity-50 cursor-not-allowed" : "",
          )}
          enterKeyHint="enter"
          placeholder={t("placeholder")}
          value={input}
          disabled={inputDisabled}
          onChange={(event) => {
            setInput(event.target.value);
          }}
          onKeyDown={(e) => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (input.trim()) {
                const form = e.currentTarget.form;
                if (form) form.requestSubmit();
              }
            }
          }}
        />
        <div className="absolute right-4 bottom-4">
          {uiStatus === "background" || uiStatus === "streaming" ? (
            <CancelButton
              className="size-7"
              showEvictionWarning={maybeEvicted}
              onUserCancel={async () => {
                await clearStudyUserChatBackgroundToken(studyUserChatId);
                setTimeout(() => window.location.reload(), 100);
              }}
            />
          ) : (
            <Button
              type="submit"
              variant="secondary"
              disabled={!input.trim()}
              className="rounded-full size-9"
            >
              <ArrowRightIcon className="h-5 w-5 text-primary" />
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
