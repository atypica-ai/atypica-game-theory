"use client";
import { interviewSessionChatBodySchema } from "@/app/(interviewProject)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
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
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { Bot, Info, Shield, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { InterviewSessionWithDetails } from "../types";

interface InterviewChatProps {
  session: InterviewSessionWithDetails;
  initialMessages?: Message[];
}

export function InterviewChat({ session, initialMessages = [] }: InterviewChatProps) {
  const isPersonaInterview = !!session.intervieweePersona;
  const interviewTarget = isPersonaInterview ? session.intervieweePersona : session.intervieweeUser;

  const initialRequestBody = {
    sessionToken: session.userChat?.token,
  };

  const useChatHelpers = useChat({
    api: "/api/chat/interviewSession",
    initialMessages,
    body: {
      sessionToken: session.userChat?.token,
    },
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const lastMessage = messages[messages.length - 1];
      const body: z.infer<typeof interviewSessionChatBodySchema> = {
        message: {
          id: lastMessage.id,
          role: lastMessage.role as "user" | "assistant",
          content: lastMessage.content,
          parts: lastMessage.parts,
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
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {session.project.user.name?.charAt(0) || session.project.user.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {session.project.user.name || session.project.user.email}
                </span>
              </div>
            </div>

            {interviewTarget && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Interview Participant</h4>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {isPersonaInterview ? (
                        <Bot className="h-3 w-3" />
                      ) : (
                        interviewTarget.name?.charAt(0) || "U"
                      )}
                    </AvatarFallback>
                  </Avatar>
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
                  This conversation is being recorded for research purposes. Your privacy will be
                  protected according to our data policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-screen w-full">
      <FocusedInterviewChat
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        showTimer={false} // Interviews don't need timer pressure
        topRightButton={projectInfoButton}
        className="h-full"
      />
    </div>
  );
}
