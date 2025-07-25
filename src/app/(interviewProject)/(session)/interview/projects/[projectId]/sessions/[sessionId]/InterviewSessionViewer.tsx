"use client";
import { restartPersonaInterviewSession } from "@/app/(interviewProject)/actions";
import { InterviewSessionWithDetails } from "@/app/(interviewProject)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
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
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { BotIcon, InfoIcon, RefreshCwIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export function InterviewSessionViewer({
  interviewSession,
  initialMessages = [],
  className,
}: {
  interviewSession: InterviewSessionWithDetails;
  initialMessages?: Message[];
  className?: string;
}) {
  const t = useTranslations("InterviewProject.sessionViewer");
  const tDetails = useTranslations("InterviewProject.projectDetails");
  const isPersonaInterview = !!interviewSession.intervieweePersona;
  const interviewTarget = isPersonaInterview
    ? interviewSession.intervieweePersona
    : interviewSession.intervieweeUser;

  const [isPending, startTransition] = useTransition();
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);

  // Use a dummy useChat for readonly viewing (no API calls)
  const useChatHelpers = useChat({
    api: "/api/dummy", // This won't be called since we're readonly
    initialMessages,
  });

  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const handleRestartChat = () => {
    startTransition(async () => {
      try {
        const result = await restartPersonaInterviewSession({
          projectId: interviewSession.projectId,
          sessionId: interviewSession.id,
        });
        if (result.success) {
          // Clear messages in the UI
          useChatHelpers.setMessages([]);
          toast.success(tDetails("restartChatConfirm"));
          setIsRestartDialogOpen(false);
          if (isPersonaInterview) {
            toast.info(tDetails("autoConversationNote"));
          }
        } else {
          toast.error(result.message || tDetails("restartError"));
        }
      } catch (error) {
        toast.error(tDetails("restartError"));
        console.error("Error restarting chat:", error);
      }
    });
  };

  // Project info dialog content
  const projectInfoButton = (
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
                <Badge variant={isPersonaInterview ? "secondary" : "default"} className="text-xs">
                  {isPersonaInterview ? (
                    <>
                      <BotIcon className="h-3 w-3 mr-1" />
                      {t("aiInterview")}
                    </>
                  ) : (
                    <>
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {t("humanInterview")}
                    </>
                  )}
                </Badge>
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
                  {interviewSession.project.user.name || interviewSession.project.user.email}
                </span>
              </div>
            </div>

            {interviewTarget && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{tDetails("interviewParticipant")}</h4>
                <div className="flex items-center space-x-2">
                  <HippyGhostAvatar
                    className="h-6 w-6"
                    seed={
                      isPersonaInterview
                        ? (interviewSession.intervieweePersona?.id ?? 0)
                        : (interviewSession.intervieweeUser?.id ?? 0)
                    }
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {interviewTarget.name ||
                      ("email" in interviewTarget ? interviewTarget.email : "Anonymous")}
                  </span>
                </div>
              </div>
            )}
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

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden flex flex-col items-stretch justify-start",
        "container max-w-[60rem] mx-auto",
        className,
      )}
    >
      {/* Header with project info */}
      <div className="border-b border-muted p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* <Link href={`/interview/projects/${interviewSession.projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link> */}
          <Badge variant={isPersonaInterview ? "secondary" : "default"} className="text-xs">
            {isPersonaInterview ? (
              <>
                <BotIcon className="h-3 w-3 mr-1" />
                {t("aiInterview")}
              </>
            ) : (
              <>
                <UsersIcon className="h-3 w-3 mr-1" />
                {t("humanInterview")}
              </>
            )}
          </Badge>
          <h1 className="text-lg font-medium">
            {interviewSession.title || t("sessionTitle")}
            {" - "}
            {interviewTarget?.name ||
              (interviewTarget && "email" in interviewTarget ? interviewTarget.email : "Anonymous")}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {isPersonaInterview && (
            <Dialog open={isRestartDialogOpen} onOpenChange={setIsRestartDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  <RefreshCwIcon className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
                  {tDetails("restartChat")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{tDetails("restartChatTitle")}</DialogTitle>
                  <DialogDescription>
                    {tDetails("restartChatDescription")}
                    {isPersonaInterview && ` ${tDetails("autoConversationNote")}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsRestartDialogOpen(false)}>
                    {tDetails("restartChatCancel")}
                  </Button>
                  <Button
                    onClick={handleRestartChat}
                    disabled={isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isPending ? tDetails("restarting") : tDetails("restartChatConfirm")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {projectInfoButton}
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <UserChatSession
          nickname={{
            assistant: t("interviewer"),
            user: interviewTarget?.name || t("participant"),
          }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed="interviewer" />,
            user: (
              <HippyGhostAvatar
                className="size-8"
                seed={
                  isPersonaInterview
                    ? (interviewSession.intervieweePersona?.id ?? 0)
                    : (interviewSession.intervieweeUser?.id ?? 0)
                }
              />
            ),
          }}
          readOnly={true}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          acceptAttachments={false}
          persistMessages={false}
        />
      </div>
    </div>
  );
}
