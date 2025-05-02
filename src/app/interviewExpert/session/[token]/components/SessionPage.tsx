"use client";

import GlobalHeader from "@/components/GlobalHeader";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ui/chat";
import { Separator } from "@/components/ui/separator";
import UserTokensBalance from "@/components/UserTokensBalance";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { InterviewExpertProject, InterviewSession } from "@prisma/client";
import { ArrowLeft, BookMarked, Cpu, Download, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export function SessionPage({
  sessionData,
}: {
  sessionData: InterviewSession & { project: InterviewExpertProject };
}) {
  const initialRequestBody = {
    projectId: sessionData.project.id,
    sessionId: sessionData.id,
  };
  const { messages, input, handleInputChange, handleSubmit, append, isLoading, error } = useChat({
    initialMessages: [],
    id: sessionData.userChatId?.toString(),
    api: "/api/chat/interviewExpert",
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      const body = { ...initialRequestBody, ...requestBody };
      return { message: messages[messages.length - 1], id, ...body };
    },
  });

  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    // If no initial message, start the conversation with AI
    if (messages.length === 0) {
      append({
        role: "system",
        content: "Starting interview session.",
      });
    }
  }, [append, messages.length]);

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader>
        <Button variant="ghost" asChild>
          <Link href={`/interviewExpert/${sessionData.project.token}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>
        </Button>
        <UserTokensBalance />
      </GlobalHeader>

      <main className="container flex-1 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{sessionData.title}</h1>
            <p className="text-muted-foreground">{sessionData.project.title}</p>

            {sessionData.summaryPoints && sessionData.summaryPoints.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowSummary(true)}
              >
                <BookMarked className="mr-2 h-4 w-4" />
                View Summary
              </Button>
            )}
          </div>

          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Interview in Progress</AlertTitle>
            <AlertDescription>
              This interview expert will ask questions based on your project's objectives. Please
              provide detailed responses to help build a comprehensive knowledge base.
            </AlertDescription>
          </Alert>

          <div
            className={cn(
              "flex-1 border rounded-lg overflow-hidden flex flex-col",
              "transition-all duration-200 ease-in-out",
              showSummary ? "lg:h-1/2" : "lg:h-auto",
            )}
          >
            <Chat
              messages={messages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              placeholder="Type your response here..."
              avatars={{
                user: (
                  <HippyGhostAvatar
                    seed={sessionData.project.userId.toString()}
                    className="size-8"
                  />
                ),
                assistant: <HippyGhostAvatar seed={sessionData.token} className="size-8" />,
              }}
              className="flex-1"
            />
          </div>

          {showSummary && sessionData.summaryPoints && sessionData.summaryPoints.length > 0 && (
            <div className="mt-4 border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Interview Summary</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
                  Hide
                </Button>
              </div>
              <div className="space-y-2">
                {sessionData.summaryPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="bg-primary/20 text-primary rounded-full size-5 flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </div>
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
              <p>Error: {error.message}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="border rounded-lg p-4 sticky top-20">
            <div className="flex items-center mb-4">
              <Cpu className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Project Details</h2>
            </div>

            <Separator className="my-4" />

            <Accordion type="multiple" defaultValue={["objectives", "about"]} className="w-full">
              <AccordionItem value="objectives">
                <AccordionTrigger>Research Objectives</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {sessionData.project.objectives.map((objective, i) => (
                      <li key={i}>{objective}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="about">
                <AccordionTrigger>About This Project</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{sessionData.project.description}</p>
                  <div className="mt-3 text-sm">
                    <span className="font-medium">Project Type:</span>{" "}
                    <span className="text-muted-foreground">{sessionData.project.type}</span>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {sessionData.analysis && (
                <AccordionItem value="analysis">
                  <AccordionTrigger>Interview Analysis</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{sessionData.analysis}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="mt-2">
                <Download className="mr-2 h-4 w-4" />
                Export Session
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
