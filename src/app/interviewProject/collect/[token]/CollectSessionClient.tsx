"use client";
import { ToolName } from "@/ai/tools";
import { CollectSessionBodySchema } from "@/app/api/chat/interviewSession/lib";
import { fetchCollectInterviewSession } from "@/app/interviewProject/actions";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { BadgeCheck, ChevronRight, Info, Shield, ThumbsUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const ProjectDetailsCard = ({
  interviewSession,
}: {
  interviewSession: ExtractServerActionData<typeof fetchCollectInterviewSession>;
}) => {
  const t = useTranslations("InterviewProject.collectSession");
  return (
    <Card className="overflow-hidden border-primary/20 py-0 h-full flex flex-col">
      <CardHeader className="bg-primary/5 pt-6 border-b border-primary/10">
        <CardTitle className="text-lg flex items-center">
          <span>{interviewSession.title}</span>
          <VerifyBadge type="verified" className="ml-2" />
        </CardTitle>
        <CardDescription>{interviewSession.project.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <p className="text-sm text-muted-foreground mb-4">{interviewSession.project.brief}</p>
        <div className="space-y-4">
          <h3 className="font-medium mb-2">{t("researchObjectives")}</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
            {interviewSession.project.objectives.map((objective, i) => (
              <li key={i}>{objective}</li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="bg-primary/5 border-t border-primary/10 px-6 pb-6 mt-auto">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>{t("privacyNotice")}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export function CollectSessionClient({
  interviewSession,
  initialMessages,
}: {
  interviewSession: ExtractServerActionData<typeof fetchCollectInterviewSession>;
  initialMessages?: Message[];
}) {
  const [interviewCompleted, setInterviewCompleted] = useState(
    interviewSession.status === "completed",
  );
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const isDesktop = useMediaQuery("lg");
  const t = useTranslations("InterviewProject.collectSession");

  const initialRequestBody = {
    sessionToken: interviewSession.token,
  };
  const useChatHelpers = useChat({
    // interviewSession.userChatId 新建以后这里并不会实时更新，chat 接口直接使用 session.userChatId, 这个 chatId 不使用也不发给后端
    // id: interviewSession.userChatId?.toString(),
    api: "/api/chat/interviewSession/collect",
    initialMessages,
    body: initialRequestBody,
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof CollectSessionBodySchema> = {
        message: messages[messages.length - 1],
        // id: interviewSession.userChatId, // 不是用 useChat 自己生成的 chatId
        ...requestBody,
      };
      return body;
    },
    onToolCall({ toolCall }) {
      if (toolCall.toolName === ToolName.saveInterviewSessionSummary) {
        setInterviewCompleted(true);
      }
    },
  });
  const { messages } = useChatHelpers;
  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (!initialMessages?.length) {
      // If no initial message and not already started, start the conversation with AI
      // useChatRef.current.append({ role: "system", content: "Starting interview session." });
      // claude 要求第一条消息必须是 user
      useChatRef.current.append({ role: "user", content: "开始" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.reload();
    }
  }, [initialMessages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      (lastMessage.content.includes("interview is now complete") ||
        lastMessage.content.includes("Thank you for completing this interview"))
    ) {
      setInterviewCompleted(true);
    }
  }, [messages]);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 lg:px-6">
          <div className="flex items-center gap-2 lg:gap-4 w-full">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-semibold">atypica.AI</span>
            </Link>
            <div className="ml-auto">
              {!isDesktop && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectDetailsOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Info className="h-4 w-4" />
                  <span>{t("projectDetails")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Chat Area - Always shown and takes full width on mobile */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden",
            isDesktop ? "lg:w-3/5 lg:border-r" : "w-full",
          )}
        >
          <Alert className="w-auto my-3 mx-3 lg:my-4 lg:mx-4">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("aboutInterview")}</AlertTitle>
            <AlertDescription>{t("interviewDescription")}</AlertDescription>
          </Alert>

          <UserChatSession
            chatId={interviewSession.userChatId?.toString()}
            // chatTitle={interviewSession.title}
            nickname={{ user: "You", assistant: "atypica.AI" }}
            avatar={{
              user: undefined,
              assistant: <HippyGhostAvatar className="size-8" seed={interviewSession.userChatId} />,
            }}
            useChatHelpers={useChatHelpers}
            useChatRef={useChatRef}
            readOnly={interviewCompleted}
          />

          {interviewCompleted && (
            <Card className="w-auto my-3 mx-3 lg:my-4 lg:mx-4">
              <CardContent className="pt-4 flex items-center justify-center flex-col text-center space-y-2">
                <div className="bg-primary/20 p-3 rounded-full">
                  <ThumbsUpIcon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-medium">{t("thankYou")}</h3>
                <p className="text-sm text-muted-foreground max-w-md">{t("thankYouMessage")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Project Details - Shown on desktop, hidden on mobile */}
        {isDesktop && (
          <div className="hidden lg:block lg:w-2/5 p-4 overflow-auto">
            <ProjectDetailsCard interviewSession={interviewSession} />
          </div>
        )}

        {/* Drawer for mobile */}
        {!isDesktop && (
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
                <ProjectDetailsCard interviewSession={interviewSession} />
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </main>

      <footer className="border-t py-2">
        <div className="flex flex-col items-center justify-between gap-4 md:h-10 md:flex-row px-4 lg:px-6">
          <div className="text-center text-xs leading-loose text-muted-foreground md:text-left">
            {t("builtWith")}{" "}
            <Link
              href="https://atypica.ai"
              target="_blank"
              className="font-medium underline underline-offset-4"
            >
              atypica.AI
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function VerifyBadge({ type, className }: { type: "verified" | "info"; className?: string }) {
  const t = useTranslations("InterviewProject.collectSession");
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        type === "verified"
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        className,
      )}
    >
      {type === "verified" ? (
        <>
          <BadgeCheck className="mr-1 h-3 w-3" />
          <span>{t("officialInterview")}</span>
        </>
      ) : (
        <>
          <Info className="mr-1 h-3 w-3" />
          <span>{t("information")}</span>
        </>
      )}
    </div>
  );
}
