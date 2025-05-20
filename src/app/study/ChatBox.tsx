import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtils";
import { ToolName } from "@/ai/tools";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserTokensBalanceStore } from "@/components/UserTokensBalance";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { userStopBackgroundStudy } from "@/lib/data/UserChat";
import { cn, useDevice } from "@/lib/utils";
import { Message, useChat } from "@ai-sdk/react";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
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
    setLastToolInvocation,
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
    append,
    addToolResult,
  } = useChat({
    id: studyUserChatId.toString(),
    initialMessages: initialMessages,
    sendExtraMessageFields: true, // send id and createdAt for each message
    api: "/api/chat/study",
    // maxSteps: 15,  // 后端 chat api 设置了 maxSteps 并且会控制，这里不能再设置，会覆盖后端的配置！
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
  const useChatRef = useRef({ reload, setMessages, append });

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

  const handleContinueChat = useCallback(() => {
    const { lastUserMessage } = popLastUserMessage(messages);
    if (lastUserMessage) {
      // 实际不会走到这里，因为页面刚打开如果有 lastUserMessage 就会自动 reload，而如果报错了，continue 按钮是禁用的
      useChatRef.current.reload();
    } else {
      // reload(); // 不能 reload 而是 append 一个消息，reload 会在前端删除最后一条 assistant 消息，但其实后端还在
      useChatRef.current.append({ role: "user", content: CONTINUE_ASSISTANT_STEPS });
    }
  }, [messages]);

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
      // console.log(`StudyUserChat [${studyUserChatId}] updated at ${chatMessageUpdatedAt}, reloading messages`);
      fetchUserChatByToken(studyUserChatToken, "study").then((result) => {
        if (result.success) {
          useChatRef.current.setMessages(result.data.messages);
        } else {
          console.error(result.message);
        }
      });
    } else {
      // console.log(`StudyUserChat [${studyUserChatId}] no updates`);
    }
  }, [studyUserChatToken, backgroundToken]);

  const { balance: userTokensBalance } = UserTokensBalanceStore();

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (!isDocumentVisible) {
        timeoutId = setTimeout(poll, 10000);
        return;
      }
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 refreshStudyUserChat 还没完成就不会 clearTimeout 了
      await refreshStudyUserChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshStudyUserChat, isDocumentVisible]);

  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (part.type === "tool-invocation") {
          setLastToolInvocation((prev) => {
            if (
              prev?.toolCallId === part.toolInvocation.toolCallId &&
              prev?.state === part.toolInvocation.state
            ) {
              return prev;
            }
            return part.toolInvocation;
          });
          return;
        }
      }
    }
  }, [messages, setLastToolInvocation]);

  const [waitForUser, studyCompleted] = useMemo(() => {
    if (backgroundToken || useChatStatus === "streaming" || useChatStatus === "submitted") {
      // 研究进行中不需要再判断 waitForUser，减少无效计算
      return [false, false];
    }
    let waitForUser = false;
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
        waitForUser = true;
      }
    }
    const studyCompleted = !!messages.find((message) => {
      return !!message.parts?.find(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === ToolName.generateReport &&
          part.toolInvocation.state === "result",
      );
    });
    return [waitForUser, studyCompleted];
  }, [messages, backgroundToken, useChatStatus]);

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
    uiStatus === "waitForUser" ||
    uiStatus === "error";
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const { isMobile } = useDevice();

  return (
    // pb-2 是为了防止 textarea 下方的圆角处不露出 messages 区域
    <div className="flex-1 overflow-hidden relative pb-2">
      <div
        ref={messagesContainerRef}
        className={cn(
          "h-full w-full flex flex-col items-center gap-4 overflow-y-auto scrollbar-thin",
          "pt-4 pb-80 px-4",
        )}
      >
        {messages.map((message, index) => (
          <SingleMessage
            key={message.id}
            message={message}
            nickname={message.role === "assistant" ? "atypica.AI" : undefined}
            addToolResult={addToolResult}
            avatar={
              message.role === "assistant" ? (
                <HippyGhostAvatar seed={studyUserChatToken} />
              ) : undefined
            }
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
      <div className="absolute bottom-0 left-0 right-0 w-full px-4 max-lg:px-1">
        <div className="relative flex flex-col items-center max-lg:items-start justify-center mb-3 max-lg:mb-1.5">
          {error && (
            <div className="text-destructive text-xs mx-32 mb-2 line-clamp-1 text-center">
              {error?.message?.toString() || error.toString()}
            </div>
          )}
          <div className="px-2 py-2 rounded-full shadow bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <StatusDisplay status={uiStatus} backgroundToken={backgroundToken} />
          </div>
          <div className="absolute right-0 bottom-0 px-1 py-1 rounded-full shadow bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <NerdStats />
          </div>
        </div>

        <form onSubmit={handleSubmitMessage} className="relative bg-background rounded-lg">
          <Textarea
            className={cn(
              "block min-h-24 max-lg:min-h-20 resize-none focus-visible:border-primary/30 transition-colors rounded-lg",
              "px-4 pt-3 pb-11",
              "text-[15px] placeholder:text-[15px]", // "text-sm placeholder:text-sm",
            )}
            enterKeyHint="enter"
            placeholder={t("placeholder")}
            value={input}
            disabled={inputDisabled}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={(e) => {
              if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
          />
          <div className="absolute right-2 bottom-2 max-lg:right-1 max-lg:bottom-1 max-lg:scale-90 max-lg:origin-bottom-right flex items-center gap-2">
            {!inputDisabled && !studyCompleted && !input.trim() && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs origin-top-right"
                onClick={handleContinueChat}
              >
                <PlayIcon className="size-2.5" />
                <span>{t("continueStudy")}</span>
              </Button>
            )}
            {uiStatus === "background" || uiStatus === "streaming" ? (
              <CancelButton
                className="size-7"
                showEvictionWarning={maybeEvicted}
                onUserCancel={async () => {
                  await userStopBackgroundStudy(studyUserChatId);
                  setTimeout(() => window.location.reload(), 100);
                }}
              />
            ) : (
              <Button
                type="submit"
                variant="secondary"
                disabled={inputDisabled || !input.trim()}
                className="rounded-full size-9"
              >
                <ArrowRightIcon className="h-5 w-5 text-primary" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
