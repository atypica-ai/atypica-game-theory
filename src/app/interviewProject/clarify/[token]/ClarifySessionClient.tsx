"use client";
import { ClarifySessionBodySchema } from "@/app/api/chat/interviewSession/lib";
import { UserChatSession } from "@/components/chat/UserChatSession";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { BookMarked, Cpu, Download, InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import { fetchClarifyInterviewSession } from "../../actions";

export function ClarifySessionClient({
  interviewSession,
  initialMessages = [],
}: {
  interviewSession: Omit<
    ExtractServerActionData<typeof fetchClarifyInterviewSession>,
    "userChatId"
  > & { userChatId: number };
  initialMessages: Message[];
}) {
  const initialRequestBody = {
    sessionToken: interviewSession.token,
  };
  const useChatHelpers = useChat({
    id: interviewSession.userChatId?.toString(),
    api: "/api/chat/interviewSession/clarify",
    initialMessages,
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof ClarifySessionBodySchema> = {
        message: messages[messages.length - 1],
        id: interviewSession.userChatId, // 不是用 useChat 自己生成的 chatId
        ...requestBody,
      };
      return body;
    },
  });
  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const [showSummary, setShowSummary] = useState(false);

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.append({
        role: "system",
        content: "Starting interview session.",
      });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  return (
    <main className="container mx-auto flex-1 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="flex-1 overflow-hidden lg:col-span-2 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{interviewSession.title}</h1>
          <p className="text-muted-foreground">{interviewSession.project.title}</p>

          {interviewSession.keyInsights && interviewSession.keyInsights.length > 0 && (
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
            This interview expert will ask questions based on your project&apos;s objectives. Please
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
          <UserChatSession
            chatId={interviewSession.userChatId?.toString()}
            chatTitle={interviewSession.title}
            useChatHelpers={useChatHelpers}
            useChatRef={useChatRef}
          />
        </div>

        {showSummary && interviewSession.keyInsights && interviewSession.keyInsights.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Interview Summary</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
                Hide
              </Button>
            </div>
            <div className="space-y-2">
              {interviewSession.keyInsights.map((point, index) => (
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
                  {interviewSession.project.objectives.map((objective, i) => (
                    <li key={i}>{objective}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="about">
              <AccordionTrigger>About This Project</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{interviewSession.project.description}</p>
                <div className="mt-3 text-sm">
                  <span className="font-medium">Project Type:</span>{" "}
                  <span className="text-muted-foreground">{interviewSession.project.category}</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            {interviewSession.analysis && (
              <AccordionItem value="analysis">
                <AccordionTrigger>Interview Analysis</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{interviewSession.analysis}</ReactMarkdown>
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
  );
}
