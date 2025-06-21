import { ToolName } from "@/ai/tools/types";
import { fetchPersonaById } from "@/app/(agents)/personas/actions";
import {
  fetchAnalystByStudyUserChatToken,
  fetchInterviewOfStudyUserChatByPersonaId,
} from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import {
  consoleStreamWaitTime,
  useProgressiveMessages,
} from "@/app/(study)/study/hooks/useProgressiveMessages";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { Analyst, Persona } from "@/prisma/client";
import { Message, ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { StreamSteps } from "./StreamSteps";

export const InterviewChatConsole = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { studyUserChat } = useStudyContext();
  const personasArg = toolInvocation.args.personas as { id: number; name: string }[];

  const [analyst, setAnalyst] = useState<Analyst>();
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
          {toolInvocation.state !== "result" && (
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
  analyst: Analyst;
  personaId: number;
  toolInvocation: ToolInvocation;
}) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { studyUserChat } = useStudyContext();

  // const [interviewId, setInterviewId] = useState<number | null>(null);
  const [backgroundToken, setBackgroundToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona>();

  const fetchUpdate = useCallback(async () => {
    try {
      const [interviewResult, personaResult] = await Promise.all([
        await fetchInterviewOfStudyUserChatByPersonaId({
          studyUserChatToken: studyUserChat.token,
          analystId: analyst.id,
          personaId,
        }),
        await fetchPersonaById(personaId),
      ]);
      if (!interviewResult.success) {
        throw interviewResult;
      }
      if (!personaResult.success) {
        throw interviewResult;
      }
      setMessages(interviewResult.data.interviewUserChat?.messages || []);
      setPersona(personaResult.data);
      setBackgroundToken(interviewResult.data.interviewUserChat?.backgroundToken ?? null);
      // setInterviewId(interviewResult.data.id);
      setConclusion(interviewResult.data.conclusion);
    } catch (error) {
      console.log("Error fetching interview:", (error as Error).message);
    }
  }, [studyUserChat.token, analyst.id, personaId]);

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
        <StreamSteps
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={personaId} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={analyst.id} />
            ) : undefined
          }
          nickname={message.role === "assistant" ? persona?.name : analyst.role}
          role={message.role}
          content={message.content}
          parts={message.parts}
        ></StreamSteps>
      ))}
      {backgroundToken && messagesDisplay.length === 0 ? (
        <StreamSteps
          key="message-start"
          nickname="System"
          role="system"
          content="Interview starting.."
        ></StreamSteps>
      ) : null}
      {!backgroundToken && conclusion && (!replay || messagesDisplay.length === messages.length) ? (
        <StreamSteps
          key="message-conclusion"
          nickname={t("researchConclusion")}
          role="system"
          content={conclusion}
        ></StreamSteps>
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
};
