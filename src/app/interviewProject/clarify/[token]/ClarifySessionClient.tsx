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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { ChevronRight, Cpu, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
  const t = useTranslations("InterviewProject.clarifySession");
  const isMediaLg = useMediaQuery("(min-width: 1024px)"); // 对应 tailwind 的 lg
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);

  const initialRequestBody = {
    sessionToken: interviewSession.token,
  };
  const useChatHelpers = useChat({
    // chat 接口直接使用 session.userChatId, 这个 chatId 不使用也不发给后端
    // id: interviewSession.userChatId?.toString(),
    api: "/api/chat/interviewSession/clarify",
    initialMessages,
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof ClarifySessionBodySchema> = {
        message: messages[messages.length - 1],
        // id: interviewSession.userChatId, // 不是用 useChat 自己生成的 chatId
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

  // Define the ProjectDetailsPanel component
  const ProjectDetailsPanel = () => (
    <div className="border rounded-lg h-full flex flex-col overflow-auto">
      <div className="p-4 flex-grow overflow-auto">
        <div className="flex items-center mb-4">
          <Cpu className="h-5 w-5 mr-2 text-primary" />
          <h2 className="text-lg font-medium">{interviewSession.project.title}</h2>
        </div>

        <Separator className="my-4" />

        <Accordion type="multiple" defaultValue={["objectives", "brief"]} className="w-full">
          <AccordionItem value="brief">
            <AccordionTrigger>{t("projectBrief")}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{interviewSession.project.brief}</p>
              <div className="mt-3 text-sm">
                <span className="font-medium">{t("projectType")}:</span>{" "}
                <span className="text-muted-foreground">{interviewSession.project.category}</span>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="objectives">
            <AccordionTrigger>{t("researchObjectives")}</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {interviewSession.project.objectives.map((objective, i) => (
                  <li key={i}>{objective}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator className="my-4" />
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      {false && !isMediaLg && (
        <Button
          variant="outline"
          onClick={() => setProjectDetailsOpen(true)}
          className="flex items-center gap-1"
        >
          <InfoIcon className="h-4 w-4" />
          <span>{t("projectDetails")}</span>
        </Button>
      )}

      <Alert className="w-auto mt-3 mx-3 lg:mt-4 lg:mx-4">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>{t("interviewInProgress")}</AlertTitle>
        <AlertDescription>{t("interviewDescription")}</AlertDescription>
      </Alert>

      {/* Main content area with responsive layout */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:mx-4 lg:mb-4">
        {/* Chat area - always shown */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            "lg:w-2/3 lg:border lg:rounded-lg max-lg:w-full max-lg:h-full",
          )}
        >
          <div className="flex-1 overflow-hidden">
            <UserChatSession
              chatId={interviewSession.userChatId?.toString()}
              // chatTitle={interviewSession.title}
              useChatHelpers={useChatHelpers}
              useChatRef={useChatRef}
            />
          </div>
        </div>

        {/* Project details - shown on desktop, hidden on mobile */}
        {isMediaLg && (
          <div className="w-1/3 overflow-auto">
            <ProjectDetailsPanel />
          </div>
        )}
      </div>

      {/* Drawer for mobile */}
      {!isMediaLg && (
        <Drawer open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen} direction="right">
          <DrawerContent className="h-full w-[85vw] max-w-md border-l">
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <DrawerTitle>{t("projectDetails")}</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="p-4 h-[calc(100%-4rem)] overflow-auto">
              <ProjectDetailsPanel />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
