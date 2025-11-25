"use client";
import {
  fetchInterviewSessionDetails,
  manuallyEndHumanInterviewSession,
  restartPersonaInterviewSession,
} from "@/app/(interviewProject)/(session)/actions";
import { InterviewToolUIPartDisplay } from "@/app/(interviewProject)/tools/ui";
import { QuestionData, TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { BotIcon, InfoIcon, RefreshCwIcon, ShieldIcon, StopCircleIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type InterviewSessionDetails = ExtractServerActionData<typeof fetchInterviewSessionDetails>;

export function InterviewSessionViewer({
  interviewSession,
  initialMessages = [],
  questions = [],
  className,
}: {
  interviewSession: InterviewSessionDetails;
  initialMessages?: TInterviewMessageWithTool[];
  questions?: QuestionData[];
  className?: string;
}) {
  const t = useTranslations("InterviewProject.sessionViewer");
  const tDetails = useTranslations("InterviewProject.projectDetails");

  const [isPending, startTransition] = useTransition();
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);

  // Use a dummy useChat for readonly viewing (no API calls)
  const useChatHelpers = useChat({
    // api: "/api/dummy", // This won't be called since we're readonly
    messages: initialMessages,
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const handleRestartChat = useCallback(async () => {
    startTransition(async () => {
      try {
        const result = await restartPersonaInterviewSession({
          projectId: interviewSession.projectId,
          sessionId: interviewSession.id,
        });
        if (!result.success) throw result;
        useChatHelpers.setMessages([]);
        setIsRestartDialogOpen(false);
        toast.info(t("autoConversationNote"));
      } catch (error) {
        toast.error((error as Error).message || t("restartError"));
        console.log("Error restarting chat:", error);
      }
    });
  }, [interviewSession.projectId, interviewSession.id, useChatHelpers, t]);

  const handleEndInterview = useCallback(async () => {
    startTransition(async () => {
      try {
        const result = await manuallyEndHumanInterviewSession({
          projectId: interviewSession.projectId,
          sessionId: interviewSession.id,
        });
        if (!result.success) throw result;
        setIsEndDialogOpen(false);
        toast.success(t("endInterviewSuccess"));
      } catch (error) {
        toast.error((error as Error).message || t("endInterviewError"));
        console.log("Error ending interview:", error);
      }
    });
  }, [interviewSession.projectId, interviewSession.id, t]);

  const getSessionDisplayName = (session: InterviewSessionDetails) => {
    if (session.intervieweePersona) {
      return session.intervieweePersona.name;
    }
    if (session.intervieweeUser) {
      return session.intervieweeUser.name;
    }
    return `#${session.id}`;
  };

  // Project info dialog content
  const ProjectInfoButton = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <InfoIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("interviewDetails")}</DialogTitle>
          <DialogDescription>{t("detailsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tDetails("projectBrief")}</CardTitle>
                {interviewSession.intervieweePersona ? (
                  <Badge variant="secondary" className="text-xs">
                    <BotIcon className="h-3 w-3 mr-1" />
                    {t("aiInterview")}
                  </Badge>
                ) : interviewSession.intervieweeUser ? (
                  <Badge variant="default" className="text-xs">
                    <UsersIcon className="h-3 w-3 mr-1" />
                    {t("humanInterview")}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {interviewSession.project.brief}
              </p>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("researcher")}</h4>
              <div className="flex items-center space-x-2">
                <HippyGhostAvatar className="h-6 w-6" seed={interviewSession.project.user.id} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {interviewSession.project.user.name}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("interviewParticipant")}</h4>
              {interviewSession.intervieweePersona ? (
                <div className="flex items-center space-x-2">
                  <HippyGhostAvatar
                    className="h-6 w-6"
                    seed={interviewSession.intervieweePersona.id}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {interviewSession.intervieweePersona.name}
                  </span>
                </div>
              ) : interviewSession.intervieweeUser ? (
                <div className="flex items-center space-x-2">
                  <HippyGhostAvatar
                    className="h-6 w-6"
                    seed={interviewSession.intervieweeUser.id}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {interviewSession.intervieweeUser.name}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <ShieldIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  {tDetails("privacyNotice")}
                </p>
                <p className="text-blue-800 dark:text-blue-200">{tDetails("privacyDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ChatRestartButton = () => (
    <Dialog open={isRestartDialogOpen} onOpenChange={setIsRestartDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <RefreshCwIcon className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
          {t("restartChat")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("restartChatTitle")}</DialogTitle>
          <DialogDescription>
            {t("restartChatDescription")}
            {t("autoConversationNote")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setIsRestartDialogOpen(false)}>
            {t("restartChatCancel")}
          </Button>
          <Button
            onClick={handleRestartChat}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? t("restarting") : t("restartChatConfirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const EndInterviewButton = () => (
    <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <StopCircleIcon className={cn("h-4 w-4 mr-2")} />
          {t("endInterview")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("endInterviewTitle")}</DialogTitle>
          <DialogDescription>
            {t("endInterviewDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>
            {t("endInterviewCancel")}
          </Button>
          <Button
            onClick={handleEndInterview}
            disabled={isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? t("ending") : t("endInterviewConfirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <FitToViewport
      className={cn(
        "overflow-hidden flex flex-col items-stretch justify-start",
        "container max-w-240 mx-auto",
        className,
      )}
    >
      {/* Header with project info */}
      <div className="border-b border-muted p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* <Link href={`/interview/project/${interviewSession.projectToken}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link> */}
          {interviewSession.intervieweePersona ? (
            <Badge variant="secondary" className="text-xs">
              <BotIcon className="h-3 w-3 mr-1" />
              {t("aiInterview")}
            </Badge>
          ) : interviewSession.intervieweeUser ? (
            <Badge variant="default" className="text-xs">
              <UsersIcon className="h-3 w-3 mr-1" />
              {t("humanInterview")}
            </Badge>
          ) : null}
          <h1 className="text-lg font-medium">
            {interviewSession.title
              ? `${interviewSession.title} (${getSessionDisplayName(interviewSession)})`
              : getSessionDisplayName(interviewSession)}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {interviewSession.intervieweePersona && <ChatRestartButton />}
          {interviewSession.intervieweeUser && <EndInterviewButton />}
          <ProjectInfoButton />
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <UserChatSession<TInterviewMessageWithTool>
          nickname={{
            assistant: t("interviewer"),
            user: interviewSession.intervieweePersona
              ? interviewSession.intervieweePersona.name
              : interviewSession.intervieweeUser
                ? interviewSession.intervieweeUser.name
                : t("participant"),
          }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed={interviewSession.projectId} />,
            user: (
              <HippyGhostAvatar
                className="size-8"
                seed={
                  interviewSession.intervieweePersona
                    ? interviewSession.intervieweePersona.id
                    : interviewSession.intervieweeUser
                      ? interviewSession.intervieweeUser.id
                      : undefined
                }
              />
            ),
          }}
          readOnly={true}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          renderToolUIPart={(toolUIPart) => (
            <InterviewToolUIPartDisplay toolUIPart={toolUIPart} questions={questions} />
          )}
          acceptAttachments={false}
          persistMessages={false}
        />
      </div>
    </FitToViewport>
  );
}
