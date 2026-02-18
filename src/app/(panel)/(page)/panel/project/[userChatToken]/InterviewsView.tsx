"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
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
}

export function InterviewsView({
  userChatToken,
  interviewBatches: initialInterviewBatches,
  totalPersonas,
}: InterviewsViewProps) {
  const t = useTranslations("PersonaPanel.InterviewsPage");
  const [interviewBatches, setInterviewBatches] = useState(initialInterviewBatches);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    initialInterviewBatches[0]?.id ?? null,
  );
  const selectedBatch = useMemo(
    () => interviewBatches.find((batch) => batch.id === selectedBatchId) ?? null,
    [interviewBatches, selectedBatchId],
  );
  const interviews = useMemo(() => selectedBatch?.interviews ?? [], [selectedBatch]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(
    interviews[0]?.personaId ?? null,
  );

  const completedCount = interviews.filter((i) => i.status === "completed").length;
  const inProgressCount = interviews.filter((i) => i.status === "in-progress").length;
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
      setSelectedBatchId(interviewBatches[0].id);
    }
  }, [interviewBatches, selectedBatchId]);

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
      {/* Compact progress bar */}
      <div className="border-b border-border px-6 py-3">
        {interviewBatches.length > 1 && (
          <div className="flex items-center gap-1 mb-3">
            {interviewBatches.map((batch, index) => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatchId(batch.id)}
                className={cn(
                  "h-6 px-2 rounded text-xs font-medium transition-colors",
                  selectedBatchId === batch.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                #{index + 1}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {completedCount > 0 && (
              <Badge variant="outline" className="text-xs font-normal gap-1 border-green-500/30">
                <CheckCircle2 className="size-3 text-green-500" />
                {completedCount} {t("completed")}
              </Badge>
            )}
            {inProgressCount > 0 && (
              <Badge variant="outline" className="text-xs font-normal gap-1">
                <Loader2 className="size-3 animate-spin" />
                {inProgressCount} {t("inProgress")}
              </Badge>
            )}
          </div>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{
                width: `${totalPersonas > 0 ? (completedCount / totalPersonas) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {t("completedOf", { completed: completedCount, total: totalPersonas })}
          </span>
        </div>
      </div>

      {/* Left-right layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Persona list */}
        <div className="w-48 lg:w-56 border-r border-border overflow-y-auto scrollbar-thin py-3 px-3 gap-1 flex flex-col">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">
            {t("title")}
          </div>
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
                        <Streamdown key={i}>{p.text}</Streamdown>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Right: Analysis */}
      <div className="hidden lg:flex flex-col w-72 border-l border-border overflow-y-auto scrollbar-thin py-4 px-4 gap-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("analysis")}
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("status")}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-normal gap-1",
                interview.status === "completed" && "border-green-500/30",
              )}
            >
              {interview.status === "completed" ? (
                <CheckCircle2 className="size-3 text-green-500" />
              ) : interview.status === "in-progress" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Circle className="size-3" />
              )}
              {t(
                interview.status === "completed"
                  ? "completed"
                  : interview.status === "in-progress"
                    ? "inProgress"
                    : "pending",
              )}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("messagesCount")}</span>
            <span className="font-medium tabular-nums">{messages.length}</span>
          </div>
        </div>

        {/* Conclusion */}
        {interview.conclusion && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("conclusion")}
            </div>
            <div className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3 border">
              <Streamdown>{interview.conclusion}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
