"use client";
import { ClientMessagePayload } from "@/ai/messageUtilsClient";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { InterviewToolName } from "@/app/(interviewProject)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { Info, Shield, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

export function InterviewSessionChatClient({
  project,
  intervieweeUser,
  userChatToken,
  initialMessages = [],
}: ExtractServerActionData<typeof fetchInterviewSessionByChatToken> & {
  userChatToken: string;
  initialMessages?: Message[];
}) {
  const t = useTranslations("InterviewProject.sessionChat");
  const tDetails = useTranslations("InterviewProject.projectDetails");
  const tSessionViewer = useTranslations("InterviewProject.sessionViewer");

  const initialRequestBody = {
    userChatToken,
  };

  const useChatHelpers = useChat({
    api: "/api/chat/interview-agent",
    initialMessages,
    body: {
      ...initialRequestBody,
    },
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const lastMessage = messages[messages.length - 1];
      const body: ClientMessagePayload = {
        message: {
          id: lastMessage.id,
          role: lastMessage.role as "user" | "assistant",
          content: lastMessage.content,
          // parts: lastMessage.parts,
        },
        ...requestBody,
      };
      return body;
    },
  });

  const useChatRef = useRef({
    append: useChatHelpers.append,
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
  });

  const { messages } = useChatHelpers;
  // Determine planning state based on messages content
  const interviewState = useMemo(() => {
    // Check if any message has endInterview tool result
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === InterviewToolName.endInterview &&
          part.toolInvocation.state === "result",
      ),
    );
    if (hasEndInterviewResult) {
      return "summary";
    }
    return "active";
  }, [messages]);

  // Automatically start the conversation when the component mounts.
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.append({ role: "user", content: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  // Project info dialog content
  const ProjectInfoButton = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{t("interviewDetails")}</DialogTitle>
          <DialogDescription>{t("detailsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tDetails("projectBrief")}</CardTitle>
                <Badge variant="default" className="text-xs">
                  <UsersIcon className="h-3 w-3 mr-1" />
                  {tSessionViewer("humanInterview")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {project.brief}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("researcher")}</h4>
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{project.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {project.user.name}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("interviewParticipant")}</h4>
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {intervieweeUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {intervieweeUser.name}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
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

  if (interviewState === "summary") {
    return (
      <FitToViewport className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {t("interviewComplete")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{t("thankYou")}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t("summaryAnalysis")}</p>
          </div>
          <ProjectInfoButton />
        </div>
      </FitToViewport>
    );
  }

  return (
    <FitToViewport>
      <FocusedInterviewChat
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={false} // Interviews don't need timer pressure
        topRightButton={<ProjectInfoButton />}
        className="h-full"
      />
    </FitToViewport>
  );
}
