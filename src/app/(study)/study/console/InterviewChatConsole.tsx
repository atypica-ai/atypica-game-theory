import { StudyUITools, ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import {
  fetchAnalystByStudyUserChatToken,
  fetchAnalystInterviewForPersona,
} from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import {
  consoleStreamWaitTime,
  useProgressiveMessages,
} from "@/app/(study)/study/hooks/useProgressiveMessages";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Analyst } from "@/prisma/client";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { StreamSteps } from "./StreamSteps";

export const InterviewChatConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, ToolName.interviewChat>>;
}) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { studyUserChat } = useStudyContext();
  // streaming 中的 tool，input.personas 可能是 undefined，personas 里面的 item 也可能是 undefined, 所以要过滤下
  const personasArg = (toolInvocation.input?.personas ?? []).filter(
    (persona) => !!persona?.id,
  ) as StudyUITools[ToolName.interviewChat]["input"]["personas"];

  const [analyst, setAnalyst] =
    useState<ExtractServerActionData<typeof fetchAnalystByStudyUserChatToken>>();
  useEffect(() => {
    (async () => {
      try {
        const result = await fetchAnalystByStudyUserChatToken({
          studyUserChatToken: studyUserChat.token,
        });
        if (!result.success) {
          throw result;
        }
        setAnalyst(result.data);
      } catch (error) {
        console.log("Error fetching analyst:", error);
      }
    })();
  }, [studyUserChat.token]);

  if (!analyst || !personasArg.length) {
    return <div className="font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-2 items-stretch justify-start w-full h-full">
      <Tabs defaultValue="1" className="flex-1 overflow-hidden flex flex-col items-stretch gap-4">
        {personasArg.map(({ id }, index) => (
          <TabsContent
            key={id}
            value={(index + 1).toString()}
            className="flex-1 overflow-hidden flex flex-col items-stretch"
          >
            <SingleInterviewChat
              key={id}
              analyst={analyst}
              personaId={id}
              toolInvocation={toolInvocation}
            ></SingleInterviewChat>
          </TabsContent>
        ))}
        <div className="flex items-center gap-6">
          {(toolInvocation.state === "input-streaming" ||
            toolInvocation.state === "input-available") && (
            <div className="flex py-2 gap-px items-center justify-start text-zinc-500 dark:text-zinc-300 text-xs font-mono">
              <span className="animate-bounce">✨ </span>
              <span className="ml-2">{t("interviewing", { count: personasArg.length })} </span>
            </div>
          )}
          <TabsList className="ml-auto flex-1 overflow-x-scroll">
            {personasArg.map(({ id, name }, index) => (
              <TabsTrigger
                key={id}
                value={(index + 1).toString()}
                style={{ width: `${100 / personasArg.length}%` }}
              >
                <HippyGhostAvatar seed={id} className="size-6" />
                <div className="max-w-24 truncate flex-1">{name}</div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <div className="bg-accent/40 rounded-lg p-6 border">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-background border size-10 flex items-center justify-center">
            📝
          </div>
          <div className="flex-1 max-h-24 overflow-y-scroll scrollbar-thin">
            <div className="text-sm font-medium mb-2">{t("researchTopic")}</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {analyst.topic}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SingleInterviewChat = ({
  analyst,
  personaId,
  toolInvocation,
}: {
  analyst: Pick<Analyst, "id" | "role" | "topic">;
  personaId: number;
  toolInvocation: ToolUIPart<Pick<StudyUITools, ToolName.interviewChat>>;
}) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { studyUserChat } = useStudyContext();

  // const [interviewId, setInterviewId] = useState<number | null>(null);
  const [backgroundToken, setBackgroundToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [persona, setPersona] =
    useState<ExtractServerActionData<typeof fetchAnalystInterviewForPersona>["persona"]>();

  const fetchUpdate = useCallback(async () => {
    try {
      const result = await fetchAnalystInterviewForPersona({
        studyUserChatToken: studyUserChat.token,
        forPersonaId: personaId,
      });
      if (!result.success) throw result;
      const { persona, interviewUserChat, conclusion } = result.data;
      setMessages((interviewUserChat?.messages || []) as TStudyMessageWithTool[]);
      setBackgroundToken(interviewUserChat?.backgroundToken ?? null);
      setPersona(persona);
      // setInterviewId(interviewResult.data.id);
      setConclusion(conclusion);
    } catch (error) {
      console.log("Error fetching interview:", (error as Error).message);
    }
  }, [studyUserChat.token, personaId]);

  const { replay } = useStudyContext();
  const { partialMessages: messagesDisplay } = useProgressiveMessages({
    uniqueId: `toolInvocation-${toolInvocation.toolCallId}`,
    messages: messages,
    enabled: replay,
    fixedDuration: consoleStreamWaitTime(ToolName.interviewChat),
  });

  // 添加定时器效果
  useEffect(() => {
    if (replay) {
      // 如果是 replay 就只取一次
      fetchUpdate();
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
  }, [fetchUpdate, replay]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-8 scrollbar-thin">
      {messagesDisplay.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={personaId} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={analyst.id} />
            ) : undefined
          }
          nickname={message.role === "assistant" ? persona?.name : analyst.role}
          message={message}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        ></StreamSteps>
      ))}
      {backgroundToken && messagesDisplay.length === 0 ? (
        <StreamSteps<TStudyMessageWithTool>
          key="message-start"
          nickname="System"
          message={{
            role: "system",
            parts: [{ type: "text", text: "Interview starting.." }],
          }}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        ></StreamSteps>
      ) : null}
      {!backgroundToken && conclusion && (!replay || messagesDisplay.length === messages.length) ? (
        <StreamSteps<TStudyMessageWithTool>
          key="message-conclusion"
          nickname={t("researchConclusion")}
          message={{
            role: "system",
            parts: [{ type: "text", text: conclusion }],
          }}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        ></StreamSteps>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
};
