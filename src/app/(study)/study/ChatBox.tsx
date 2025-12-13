import {
  ClientMessagePayload,
  CONTINUE_ASSISTANT_STEPS,
  prepareLastUIMessageForRequest,
} from "@/ai/messageUtilsClient";
import { ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import { fetchChatTitlesByTokens } from "@/app/(newStudy)/actions";
import { NewStudyButton } from "@/app/(newStudy)/components/NewStudyInputBox";
import { useTokensBalance } from "@/app/account/hooks";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/hooks/use-device";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { UserChatExtra } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolOrDynamicToolUIPart,
  isToolUIPart,
  UIMessage,
} from "ai";
import { ArrowRightIcon, PlayIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchUserChatByToken,
  fetchUserChatStateByToken,
  userStopBackgroundStudyAction,
} from "./actions";
import { AnalystAttachments } from "./components/AnalystAttachments";
import { CancelButton, StatusDisplay } from "./components/StatusDisplay";
import { useStudyContext } from "./hooks/StudyContext";
import { SingleMessage } from "./SingleMessage";
import { StudyFeedback } from "./StudyFeedback";
import { StudyNextSteps } from "./StudyNextSteps";

function popLastUserMessage(messages: UIMessage[]) {
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
  const locale = useLocale();
  const {
    setLastToolInvocation,
    studyUserChat: {
      id: studyUserChatId,
      token: studyUserChatToken,
      messages: initialMessages,
      backgroundToken: initialBackgroundToken,
      extra,
    },
  } = useStudyContext();

  const [referenceChatTitles, setReferenceChatTitles] = useState<
    { token: string; title: string }[]
  >([]);

  useEffect(() => {
    const loadReferenceChatTitles = async () => {
      const extraData = extra as UserChatExtra;
      const referenceTokens = extraData?.referenceUserChats;
      if (referenceTokens && referenceTokens.length > 0) {
        const result = await fetchChatTitlesByTokens(referenceTokens);
        if (result.success) {
          setReferenceChatTitles(result.data);
        }
      }
    };
    loadReferenceChatTitles();
  }, [extra]);

  const extraRequestPayload = useMemo(
    () => ({ userChatToken: studyUserChatToken }),
    [studyUserChatToken],
  );

  const {
    messages,
    sendMessage,
    setMessages,
    error,
    // handleSubmit,
    // setInput,
    status: useChatStatus,
    regenerate,
    // append,
    addToolOutput: _addToolOutput,
  } = useChat({
    id: studyUserChatId.toString(),
    // 下面这行设置了以后可以实现：addToolResult 调用以后，立即调用 sendMessage，但是它个有问题，在工具调用出错以后，会进入死循环，所以改成人工 sendMessage
    // sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: initialMessages,
    // experimental_throttle: 300,
    // maxSteps: 15,  // 后端 chat api 设置了 maxSteps 并且会控制，这里不能再设置，会覆盖后端的配置！
    // body: { ...extraRequestPayload }, v5 现在放在 sendMessage 里直接提交
    onError(error) {
      if (/network error/.test(error?.message)) {
        // 这里应该不会无限循环，因为 onError 的时候肯定是 assistant 消息在回复，所以 reload 以后最后一条消息不会是 user，也就不会立即开始 chat
        location.reload();
      }
    },
    transport: new DefaultChatTransport({
      api: "/api/chat/study",
      // see https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence#sending-only-the-last-message
      prepareSendMessagesRequest({ messages, id }) {
        const body: ClientMessagePayload = {
          id,
          message: prepareLastUIMessageForRequest(messages),
          ...extraRequestPayload,
        };
        // useChat 上的 id 也在参数里，不过这里没用到，只是 debug 一下
        console.debug("study experimental_prepareRequestBody", messages, id);
        return { body };
      },
    }),
  });

  const [backgroundToken, setBackgroundToken] = useState<string | null>(initialBackgroundToken);
  const useChatRef = useRef({ regenerate, setMessages, sendMessage });

  const [input, setInput] = useState("");
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
      useChatRef.current.sendMessage({ text: input });
      setInput("");
    },
    [input, lastSubmitTime],
  );

  const addToolResult = useCallback(
    async (...args: Parameters<typeof _addToolOutput>) => {
      await _addToolOutput(...args); // 首先调用 useChat 上的 addToolResult 修改 ToolUIPart 的状态
      useChatRef.current.sendMessage(); // 不传参数调用 sendMessage 直接发送最后一条 assistant 消息
    },
    [_addToolOutput],
  );

  // React 在 development 模式下默认会执行两次 useEffect，这是 React 的严格模式的有意设计，帮助发现副作用
  // 两次请求会触发争夺 backgroundToken 冲突，需要阻止
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    // 如果最初最后一条消息是用户消息，则立即开始聊天，但如果 backgroundToken 不为空，不要发起聊天
    const { lastUserMessage } = popLastUserMessage(initialMessages);
    if (lastUserMessage && !backgroundToken) {
      useChatRef.current.regenerate();
    }
  }, [initialMessages, backgroundToken]);

  const handleContinueChat = useCallback(() => {
    const { lastUserMessage } = popLastUserMessage(messages);
    if (lastUserMessage) {
      // 实际不会走到这里，因为页面刚打开如果有 lastUserMessage 就会自动 regenerate，而如果报错了，continue 按钮是禁用的
      useChatRef.current.regenerate();
    } else {
      // reload(); // 不能 reload 而是 append 一个消息，reload 会在前端删除最后一条 assistant 消息，但其实后端还在
      useChatRef.current.sendMessage({ text: CONTINUE_ASSISTANT_STEPS });
      // both works, see https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#message-sending-append--sendmessage
      // useChatRef.current.sendMessage({
      //   role: "user",
      //   parts: [{ type: "text", text: CONTINUE_ASSISTANT_STEPS }],
      // });
    }
  }, [messages]);

  // const [chatUpdatedAt, setChatUpdatedAt] = useState<Date | null>(null);
  // 使用 ref，确保 useCallback 里面取到最新值，并且变化了以后不触发 refreshStudyUserChat 和 useEffect 更新
  const chatUpdatedAt = useRef<number | null>(null);
  const [maybeEvicted, setMaybeEvicted] = useState(false);
  const refreshStudyUserChat = useCallback(async () => {
    const result = await fetchUserChatStateByToken(studyUserChatToken, "study");
    if (!result.success) {
      console.log(result.message);
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
          useChatRef.current.setMessages(result.data.messages as TStudyMessageWithTool[]);
        } else {
          console.log(result.message);
        }
      });
    } else {
      // console.log(`StudyUserChat [${studyUserChatId}] no updates`);
    }
  }, [studyUserChatToken, backgroundToken]);

  const { balance: userTokensBalance } = useTokensBalance();

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (!backgroundToken) {
        // 在 background 状态时定期刷新
        return;
      }
      if (!isDocumentVisible) {
        timeoutId = setTimeout(poll, 30000);
        return;
      }
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 refreshStudyUserChat 还没完成就不会 clearTimeout 了
      await refreshStudyUserChat();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshStudyUserChat, isDocumentVisible, backgroundToken]);

  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (isToolOrDynamicToolUIPart(part)) {
          setLastToolInvocation(part);
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
    if (lastMessage?.parts?.length) {
      const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
      if (
        isToolUIPart(lastPart) &&
        lastPart.state !== "output-available" &&
        [ToolName.requestPayment, ToolName.requestInteraction].includes(
          getToolName(lastPart) as ToolName,
        )
      ) {
        waitForUser = true;
      }
    }
    // Study completed when either report or podcast is generated
    const studyCompleted = !!messages.find((message) => {
      return !!message.parts?.find(
        (part) =>
          (part.type === `tool-${ToolName.generateReport}` ||
            part.type === `tool-${ToolName.generatePodcast}`) &&
          // "toolCallId" in part &&  // part.type === `tool-xxx` can infer toolInvocation type
          part.state === "output-available",
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
            : userTokensBalance !== null &&
                userTokensBalance !== "Unlimited" &&
                userTokensBalance <= 0
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
        className={cn("h-full w-full space-y-4 overflow-y-auto scrollbar-thin", "pt-4 pb-60 px-4")}
      >
        {/* Reference Chats Display */}
        {referenceChatTitles.length > 0 && (
          <div className="w-full flex items-center justify-start gap-2 flex-wrap mt-4">
            <span className="text-xs text-muted-foreground">{t("referenceContext")}:</span>
            {referenceChatTitles.map((chat) => (
              <Link
                key={chat.token}
                href={`/study/${chat.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 border border-border rounded-sm"
              >
                {chat.title}
              </Link>
            ))}
          </div>
        )}

        {/* Attachments */}
        <AnalystAttachments />

        <div className="flex flex-col items-center gap-4">
          {messages.map((message, index) => (
            <SingleMessage
              className={cn({
                "not-first-of-type:border-t-0 not-first-of-type:pt-0 mt-1":
                  referenceChatTitles.length > 0 && index === 0,
              })}
              key={message.id}
              message={message}
              nickname={message.role === "assistant" ? "atypica.AI" : undefined}
              // addToolResult={addToolResult}
              renderToolUIPart={(toolPart) => (
                <StudyToolUIPartDisplay toolUIPart={toolPart} addToolResult={addToolResult} />
              )}
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
              //           console.log(result.message);
              //         }
              //       }
              //     : undefined
              // }
              isLastMessage={index === messages.length - 1}
            ></SingleMessage>
          ))}
        </div>

        {/* AI Compliance Disclaimer */}
        {messages.length > 0 && uiStatus === "ready" ? (
          <div className="w-full text-xs text-left text-zinc-400 dark:text-zinc-600 mb-6">
            {locale === "zh-CN" ? "以上内容由人工智能生成" : ""}
          </div>
        ) : null}

        {/* Study Next Steps */}
        {studyCompleted && uiStatus === "ready" ? (
          <div className="w-full mt-4">
            <StudyNextSteps studyUserChatToken={studyUserChatToken} sendMessage={sendMessage} />
          </div>
        ) : null}

        {/* Study Feedback */}
        {studyCompleted && uiStatus === "ready" ? (
          <div className="w-full mt-4 flex justify-start">
            <StudyFeedback studyUserChatId={studyUserChatId} />
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 w-full px-4 max-lg:px-1">
        <div
          className={cn(
            "relative flex flex-col items-center justify-center mb-3",
            // "max-lg:items-start max-lg:mb-1.5",
          )}
        >
          {error && (
            <div className="text-destructive text-xs mx-32 mb-2 line-clamp-1 text-center">
              {error?.message?.toString() || error.toString()}
            </div>
          )}
          <div className="px-2 py-2 rounded-full shadow bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/90">
            <StatusDisplay status={uiStatus} backgroundToken={backgroundToken} />
          </div>
          {/*<div className="absolute right-0 bottom-0 px-1 py-1 rounded-full shadow bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <NerdStats />
          </div>*/}
        </div>

        <form onSubmit={handleSubmitMessage} className="relative bg-background rounded-lg">
          <Textarea
            className={cn(
              "block min-h-24 max-lg:min-h-20 resize-none focus-visible:border-primary/30 transition-colors rounded-lg",
              "px-4 pt-3 pb-11",
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
                className="h-8 text-xs"
                onClick={handleContinueChat}
              >
                <PlayIcon className="size-2.5" />
                <span>{t("continueStudy")}</span>
              </Button>
            )}
            {!inputDisabled && studyCompleted && !input.trim() && (
              <NewStudyButton>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <PlusIcon className="size-2.5" />
                  <span>{t("startNewStudy")}</span>
                </Button>
              </NewStudyButton>
            )}
            {uiStatus === "background" || uiStatus === "streaming" ? (
              <CancelButton
                className="size-7"
                showEvictionWarning={maybeEvicted}
                onUserCancel={async () => {
                  await userStopBackgroundStudyAction(studyUserChatId);
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
