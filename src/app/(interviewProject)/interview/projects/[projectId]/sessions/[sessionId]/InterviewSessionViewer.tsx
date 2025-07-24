"use client";
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
import { ArrowLeft, Bot, Info, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

interface InterviewSessionViewerProps {
  session: InterviewSessionWithDetails;
  initialMessages?: Message[];
  className?: string;
}

export function InterviewSessionViewer({
  session,
  initialMessages = [],
  className,
}: InterviewSessionViewerProps) {
  const isPersonaInterview = !!session.intervieweePersona;
  const interviewTarget = isPersonaInterview ? session.intervieweePersona : session.intervieweeUser;

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

  // Project info dialog content
  const projectInfoButton = (
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Interview Project Details</DialogTitle>
          <DialogDescription>Information about this interview project</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Project Brief</CardTitle>
                <Badge variant={isPersonaInterview ? "secondary" : "default"} className="text-xs">
                  {isPersonaInterview ? (
                    <>
                      <Bot className="h-3 w-3 mr-1" />
                      AI Interview
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 mr-1" />
                      Human Interview
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {session.project.brief}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Researcher</h4>
              <div className="flex items-center space-x-2">
                <HippyGhostAvatar className="h-6 w-6" seed={session.project.user.id} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {session.project.user.name || session.project.user.email}
                </span>
              </div>
            </div>

            {interviewTarget && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Interview Participant</h4>
                <div className="flex items-center space-x-2">
                  <HippyGhostAvatar
                    className="h-6 w-6"
                    seed={
                      isPersonaInterview
                        ? session.intervieweePersonaId || 0
                        : session.intervieweeUserId || 0
                    }
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {interviewTarget.name || "Anonymous"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Privacy Notice</p>
                <p className="text-blue-800 dark:text-blue-200">
                  This conversation was recorded for research purposes. Privacy is protected
                  according to our data policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={cn("h-screen w-full flex flex-col", className)}>
      {/* Header with project info */}
      <div className="border-b bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href={`/projects/${session.projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
          </Link>
          <Badge variant={isPersonaInterview ? "secondary" : "default"} className="text-xs">
            {isPersonaInterview ? (
              <>
                <Bot className="h-3 w-3 mr-1" />
                AI Interview
              </>
            ) : (
              <>
                <Users className="h-3 w-3 mr-1" />
                Human Interview
              </>
            )}
          </Badge>
          <h1 className="text-lg font-medium">
            Interview Session #{session.id} - {interviewTarget?.name || "Anonymous"}
          </h1>
        </div>
        {projectInfoButton}
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <UserChatSession
          chatTitle={`Interview with ${interviewTarget?.name || "Anonymous"}`}
          nickname={{
            assistant: "Interviewer AI",
            user: interviewTarget?.name || "Participant",
          }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed="interviewer" />,
            user: (
              <HippyGhostAvatar
                className="size-8"
                seed={
                  isPersonaInterview
                    ? session.intervieweePersonaId || 0
                    : session.intervieweeUserId || 0
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
