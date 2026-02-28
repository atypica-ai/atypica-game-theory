"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  fetchInterviewBatchesByProjectToken,
  fetchInterviewMessages,
  type InterviewBatch,
  type PanelInterview,
} from "./actions";

interface InterviewsViewProps {
  userChatToken: string;
  interviewBatches: InterviewBatch[];
  totalPersonas: number;
  selectedBatchId: string | null;
  onBatchSelect: (batchId: string) => void;
}

export function InterviewsView({
  userChatToken,
  interviewBatches: initialInterviewBatches,
  totalPersonas,
  selectedBatchId,
  onBatchSelect,
}: InterviewsViewProps) {
  const t = useTranslations("PersonaPanel.InterviewsPage");
  const [interviewBatches, setInterviewBatches] = useState(initialInterviewBatches);
  const selectedBatch = useMemo(
    () => interviewBatches.find((batch) => batch.id === selectedBatchId) ?? null,
    [interviewBatches, selectedBatchId],
  );
  const interviews = useMemo(() => selectedBatch?.interviews ?? [], [selectedBatch]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(
    interviews[0]?.personaId ?? null,
  );

  const completedCount = interviews.filter((i) => i.status === "completed").length;
  const hasRunning = interviewBatches.some((batch) =>
    batch.interviews.some((interview) => interview.status === "in-progress"),
  );
  const hasPending = interviewBatches.some((batch) =>
    batch.interviews.some((interview) => interview.status === "pending"),
  );

  // Poll for status updates while any interview is in progress
  const fetchUpdate = useCallback(async () => {
    try {
      const result = await fetchInterviewBatchesByProjectToken(userChatToken);
      if (result.success) {
        setInterviewBatches(result.data.interviewBatches);
      }
    } catch {
      // silently ignore
    }
  }, [userChatToken]);

  useEffect(() => {
    if (!hasRunning && !hasPending) return;
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      await fetchUpdate();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchUpdate, hasPending, hasRunning]);

  useEffect(() => {
    if (!selectedBatchId && interviewBatches.length > 0) {
      onBatchSelect(interviewBatches[0].id);
    }
  }, [interviewBatches, selectedBatchId, onBatchSelect]);

  useEffect(() => {
    const selected = interviews.find((interview) => interview.personaId === selectedPersonaId);
    if (selected) return;
    setSelectedPersonaId(interviews[0]?.personaId ?? null);
  }, [interviews, selectedPersonaId]);

  const selectedInterview =
    interviews.find((interview) => interview.personaId === selectedPersonaId) ?? null;

  if (interviewBatches.length === 0 || interviews.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("noInterviews")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Interview list */}
        <div className="w-48 lg:w-56 border-r border-border py-3 px-3 flex flex-col">
          {/* Progress section - fixed */}
          <div className="space-y-2 pb-3 border-b border-border">
            <div className="text-xs text-muted-foreground">
              {completedCount}/{totalPersonas} {t("completed")}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{
                  width: `${totalPersonas > 0 ? (completedCount / totalPersonas) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Interview list header - fixed */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pt-3">
            {t("title")}
          </div>

          {/* Interview list - scrollable */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-1 space-y-1">
            {interviews.map((interview) => {
              const isSelected = selectedPersonaId === interview.personaId;
              const StatusIcon =
                interview.status === "completed"
                  ? CheckCircle2
                  : interview.status === "in-progress"
                    ? Loader2
                    : Circle;
              const statusColor =
                interview.status === "completed"
                  ? "text-green-500"
                  : interview.status === "in-progress"
                    ? "text-amber-500 animate-spin"
                    : "text-muted-foreground/30";

              return (
                <button
                  key={`${interview.personaId}-${interview.id ?? "pending"}`}
                  onClick={() => setSelectedPersonaId(interview.personaId)}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors w-full",
                    isSelected
                      ? "bg-muted/60 text-foreground"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                  )}
                >
                  <HippyGhostAvatar seed={interview.personaId} className="size-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{interview.personaName}</div>
                    {interview.messageCount > 0 && (
                      <div className="text-xs text-muted-foreground/60">
                        {t("messages", { count: interview.messageCount })}
                      </div>
                    )}
                  </div>
                  <StatusIcon className={cn("size-3.5 shrink-0", statusColor)} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center + Right: Interview content */}
        {selectedInterview ? (
          <InterviewContent interview={selectedInterview} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {t("selectInterview")}
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewContent({ interview }: { interview: PanelInterview }) {
  const t = useTranslations("PersonaPanel.InterviewsPage");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!interview.interviewUserChat?.token) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    try {
      const result = await fetchInterviewMessages(interview.interviewUserChat.token);
      if (result.success) {
        setMessages(result.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [interview.interviewUserChat?.token]);

  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    fetchMessages();

    if (interview.status !== "in-progress") return;
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      await fetchMessages();
    };
    const startPoll = setTimeout(() => poll(), 5000);
    return () => {
      clearTimeout(startPoll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchMessages, interview.id, interview.status]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <>
      {/* Center: Messages */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-4"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("noMessages")}</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <HippyGhostAvatar
                  seed={message.role === "assistant" ? interview.personaId : 0}
                  className="size-7 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">
                    {message.role === "assistant" ? interview.personaName : "atypica.AI"}
                  </div>
                  <div className="text-sm">
                    {message.parts
                      .filter((p): p is { type: "text"; text: string } => p.type === "text")
                      .map((p, i) => (
                        <Streamdown mode="static" key={i}>
                          {p.text}
                        </Streamdown>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Right: Status + Outputs */}
      <div className="hidden lg:flex flex-col w-72 border-l border-border">
        {/* Status - fixed */}
        <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("status")}
          </span>
          <div className="flex items-center gap-1.5">
            {interview.status === "completed" ? (
              <>
                <CheckCircle2 className="size-3 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("completed")}
                </span>
              </>
            ) : interview.status === "in-progress" ? (
              <>
                <Loader2 className="size-3 animate-spin text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("inProgress")}
                </span>
              </>
            ) : (
              <>
                <Circle className="size-3 text-muted-foreground/50" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("pending")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs - all tabs visible */}
        <Tabs defaultValue="conclusion" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border justify-start shrink-0">
            {interview.conclusion && (
              <TabsTrigger
                value="conclusion"
                className="text-xs font-medium uppercase tracking-wide py-2.5 px-3 rounded-none border-b border-transparent data-[state=active]:border-foreground/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("conclusion")}
              </TabsTrigger>
            )}
            <TabsTrigger
              value="artifacts"
              className="text-xs font-medium uppercase tracking-wide py-2.5 px-3 rounded-none border-b border-transparent data-[state=active]:border-foreground/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("artifacts")}
            </TabsTrigger>
          </TabsList>

          {/* Tab contents - scrollable */}
          {interview.conclusion && (
            <TabsContent value="conclusion" className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 mt-0 text-xs leading-relaxed">
              <Streamdown mode="static">{interview.conclusion}</Streamdown>
            </TabsContent>
          )}
          <TabsContent value="artifacts" className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 mt-0 text-xs text-muted-foreground/60 italic">
            {t("artifactsPlaceholder")}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
