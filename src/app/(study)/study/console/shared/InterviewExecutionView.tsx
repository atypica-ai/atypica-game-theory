import { fetchPersonaInterviewInStudy } from "@/app/(study)/study/actions";
import { StudyToolName, StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { ExtractServerActionData } from "@/lib/serverAction";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { StreamSteps } from "../StreamSteps";

export function InterviewExecutionView({
  toolInvocation,
  studyUserChatToken,
  studyUserAvatarSeed,
  replay = false,
  researchTopic,
  renderToolUIPart,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.interviewChat>>;
  studyUserChatToken: string;
  studyUserAvatarSeed?: string | number;
  replay?: boolean;
  researchTopic?: string;
  renderToolUIPart: (toolPart: TStudyMessageWithTool["parts"][number]) => ReactNode;
}) {
  const t = useTranslations("StudyPage.ToolConsole");
  const personasArg = (toolInvocation.input?.personas ?? []).filter(
    (persona) => !!persona?.id,
  ) as StudyUITools[StudyToolName.interviewChat]["input"]["personas"];

  if (!personasArg.length) {
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
            <SingleInterviewExecution
              personaId={id}
              studyUserChatToken={studyUserChatToken}
              studyUserAvatarSeed={studyUserAvatarSeed}
              replay={replay}
              renderToolUIPart={renderToolUIPart}
            />
          </TabsContent>
        ))}
        <div className="flex items-center gap-6">
          {(toolInvocation.state === "input-streaming" ||
            toolInvocation.state === "input-available") && (
            <div className="flex py-2 gap-px items-center justify-start text-zinc-500 dark:text-zinc-300 text-xs font-mono">
              <span className="animate-bounce">✨ </span>
              <span className="ml-2">{t("interviewing", { count: personasArg.length })}</span>
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
      {researchTopic ? (
        <div className="bg-accent/40 rounded-lg p-6 border">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background border size-10 flex items-center justify-center">
              📝
            </div>
            <div className="flex-1 max-h-24 overflow-y-scroll scrollbar-thin">
              <div className="text-sm font-medium mb-2">{t("researchTopic")}</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {researchTopic}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SingleInterviewExecution({
  personaId,
  studyUserChatToken,
  studyUserAvatarSeed,
  replay,
  renderToolUIPart,
}: {
  personaId: number;
  studyUserChatToken: string;
  studyUserAvatarSeed?: string | number;
  replay: boolean;
  renderToolUIPart: (toolPart: TStudyMessageWithTool["parts"][number]) => ReactNode;
}) {
  const t = useTranslations("StudyPage.ToolConsole");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [persona, setPersona] =
    useState<ExtractServerActionData<typeof fetchPersonaInterviewInStudy>["persona"]>();

  const fetchUpdate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await fetchPersonaInterviewInStudy({
        userChatToken: studyUserChatToken,
        forPersonaId: personaId,
      });
      if (!result.success) throw result;
      const { persona, interviewUserChat, conclusion } = result.data;
      setMessages((interviewUserChat?.messages || []) as TStudyMessageWithTool[]);
      setPersona(persona);
      setConclusion(conclusion);
      if (replay) return false;
      if (!interviewUserChat?.token) {
        return !conclusion;
      }
      if (!replay && interviewUserChat.token) {
        const stateResult = await fetchUserChatStateByTokenAction({
          userChatToken: interviewUserChat.token,
          kind: "interview",
        });
        if (stateResult.success) {
          const nextIsRunning = stateResult.data.isRunning;
          setIsRunning(nextIsRunning);
          return nextIsRunning || !conclusion;
        }
      }
      return true;
    } catch (error) {
      console.log("Error fetching interview:", (error as Error).message);
      return true;
    }
  }, [studyUserChatToken, personaId, replay]);

  useEffect(() => {
    if (replay) {
      fetchUpdate();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const shouldContinue = await fetchUpdate();
      if (cancelled) return;
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 5000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchUpdate, replay]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-8 scrollbar-thin">
      {messages.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={personaId} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={studyUserAvatarSeed ?? studyUserChatToken} />
            ) : undefined
          }
          nickname={message.role === "assistant" ? persona?.name : "atypica.AI"}
          message={message}
          renderToolUIPart={renderToolUIPart}
        />
      ))}
      {isRunning && messages.length === 0 ? (
        <StreamSteps<TStudyMessageWithTool>
          key="message-start"
          nickname="System"
          message={{
            role: "system",
            parts: [{ type: "text", text: "Interview starting.." }],
          }}
          renderToolUIPart={renderToolUIPart}
        />
      ) : null}
      {!isRunning && conclusion ? (
        <StreamSteps<TStudyMessageWithTool>
          key="message-conclusion"
          nickname={t("researchConclusion")}
          message={{
            role: "system",
            parts: [{ type: "text", text: conclusion }],
          }}
          renderToolUIPart={renderToolUIPart}
        />
      ) : null}
      <div ref={messagesEndRef} />
    </div>
  );
}
