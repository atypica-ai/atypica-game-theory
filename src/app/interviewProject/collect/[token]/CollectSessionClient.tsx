"use client";
import { CollectSessionBodySchema } from "@/app/api/chat/interviewSession/lib";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { BadgeCheck, Info, Shield, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { fetchCollectInterviewSession } from "../../actions";

export function CollectSessionClient({
  interviewSession,
  initialMessages,
}: {
  interviewSession: ExtractServerActionData<typeof fetchCollectInterviewSession>;
  initialMessages?: Message[];
}) {
  const [interviewComplete, setInterviewComplete] = useState(false);
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
      useChatRef.current.append({
        role: "system",
        content: "Starting interview session.",
      });
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
      setInterviewComplete(true);
    }
  }, [messages]);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center max-w-4xl mx-auto">
          <Link href="/" className="flex items-center space-x-2">
            <HippyGhostAvatar seed="atypica" className="h-6 w-6" />
            <span className="font-semibold">atypica.AI</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col space-y-6">
          <Card className="overflow-hidden border-primary/20 py-0">
            <CardHeader className="bg-primary/5 pt-6 border-b border-primary/10">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <span>{interviewSession.title}</span>
                    <VerifyBadge type="verified" className="ml-2" />
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {interviewSession.project.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {interviewSession.description && (
                <p className="text-muted-foreground mb-4">{interviewSession.description}</p>
              )}
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("aboutInterview")}</AlertTitle>
                  <AlertDescription>
                    {t("interviewDescription")}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-sm font-medium mb-2">{t("researchObjectives")}</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
                    {interviewSession.project.objectives.map((objective, i) => (
                      <li key={i}>{objective}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-primary/5 border-t border-primary/10 px-6 pb-6">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>{t("privacyNotice")}</span>
              </div>
            </CardFooter>
          </Card>

          <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
            <UserChatSession
              chatId={interviewSession.userChatId?.toString()}
              chatTitle={interviewSession.title}
              useChatHelpers={useChatHelpers}
              useChatRef={useChatRef}
            />
          </div>

          {interviewComplete && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center flex-col text-center space-y-2">
                  <div className="bg-primary/20 p-3 rounded-full">
                    <ThumbsUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium">{t("thankYou")}</h3>
                  <p className="text-muted-foreground max-w-md">
                    {t("thankYouMessage")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row max-w-4xl mx-auto">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            {t("builtWith")}{" "}
            <a
              href="https://atypica.ai"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              atypica.AI
            </a>
          </p>
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
