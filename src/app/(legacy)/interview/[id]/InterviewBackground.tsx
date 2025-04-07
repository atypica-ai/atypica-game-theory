"use client";
import { ChatMessage } from "@/components/ChatMessage";
import { PointAlertDialog } from "@/components/PointAlertDialog";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { Analyst, Persona } from "@prisma/client";
import { Message } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { fetchAnalystInterviewById } from "../actions";

type AnalystInterview = ExtractServerActionData<typeof fetchAnalystInterviewById>;

export function InterviewBackground({
  analystInterview: _analystInterview,
  analyst,
  persona,
}: {
  analystInterview: AnalystInterview;
  analyst: Analyst;
  persona: Persona;
}) {
  const t = useTranslations("InterviewPage");
  const [interview, setInterview] = useState<AnalystInterview>(_analystInterview);
  const [messages, setMessages] = useState<Message[]>(_analystInterview.messages);

  const fetchUpdate = useCallback(async () => {
    try {
      const result = await fetchAnalystInterviewById(interview.id);
      if (!result.success) {
        throw result;
      }
      setMessages(result.data.messages);
      setInterview(result.data);
    } catch (error) {
      console.log("Error fetching analystInterview:", (error as Error).message);
    }
  }, [interview.id]);

  // 添加定时器效果
  useEffect(() => {
    const intervalId: NodeJS.Timeout = setInterval(fetchUpdate, 1000);
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchUpdate]);

  const startBackgroundChat = useCallback(async () => {
    await fetch("/api/chat/interview/background", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analyst,
        persona,
        analystInterviewId: interview.id,
      }),
    });
    await fetchUpdate();
  }, [fetchUpdate, analyst, persona, interview.id]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto scrollbar-thin",
        "flex flex-col items-center justify-start p-3 w-full max-w-5xl mx-auto",
      )}
    >
      <div className="relative w-full mb-4">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">
          {t("interviewTitle", { role: analyst.role, persona: persona.name })}
        </h1>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col justify-between gap-4 w-full">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-6 h-full w-full items-center overflow-y-scroll"
        >
          {messages.map((message) => (
            <ChatMessage
              key={`message-${message.id}`}
              nickname={message.role === "assistant" ? persona.name : analyst.role}
              role={message.role}
              content={message.content}
              parts={message.parts}
            ></ChatMessage>
          ))}
          {interview.interviewToken && messages.length === 0 ? (
            <ChatMessage
              key="message-start"
              nickname="系统"
              role="system"
              content="访谈启动中 .."
            ></ChatMessage>
          ) : null}
          {!interview.interviewToken && interview.conclusion ? (
            <ChatMessage
              key="message-conclusion"
              nickname={t("researchConclusion")}
              role="system"
              content={interview.conclusion}
            ></ChatMessage>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex justify-center items-center">
          {!interview.interviewToken && !interview.conclusion ? (
            <PointAlertDialog points={5} onConfirm={startBackgroundChat}>
              <Button size="sm" className="px-10">
                {t("startInterview")}
              </Button>
            </PointAlertDialog>
          ) : interview.interviewToken ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">{t("interviewInProgress")}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">{t("interviewCompleted")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
