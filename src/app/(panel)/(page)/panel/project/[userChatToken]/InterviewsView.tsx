"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { fetchInterviewMessages, fetchInterviewsByPanelId, type PanelInterview } from "./actions";

interface InterviewsViewProps {
  panelId: number;
  interviews: PanelInterview[];
  totalPersonas: number;
}

export function InterviewsView({
  panelId,
  interviews: initialInterviews,
  totalPersonas,
}: InterviewsViewProps) {
  const t = useTranslations("PersonaPanel.InterviewsPage");
  const [interviews, setInterviews] = useState(initialInterviews);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialInterviews.length > 0 ? initialInterviews[0].id : null,
  );

  const completedCount = interviews.filter((i) => i.status === "completed").length;
  const inProgressCount = interviews.filter((i) => i.status === "in-progress").length;
  const hasRunning = inProgressCount > 0;

  // Poll for status updates while any interview is in progress
  const fetchUpdate = useCallback(async () => {
    try {
      const result = await fetchInterviewsByPanelId(panelId);
      if (result.success) {
        setInterviews(result.data.interviews);
      }
    } catch {
      // silently ignore
    }
  }, [panelId]);

  useEffect(() => {
    if (!hasRunning) return;
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      await fetchUpdate();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchUpdate, hasRunning]);

  const selectedInterview = interviews.find((i) => i.id === selectedId) ?? null;

  if (interviews.length === 0) {
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
            const isSelected = selectedId === interview.id;
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
                key={interview.id}
                onClick={() => setSelectedId(interview.id)}
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
          <InterviewContent panelId={panelId} interview={selectedInterview} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {t("selectInterview")}
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewContent({ panelId, interview }: { panelId: number; interview: PanelInterview }) {
  const t = useTranslations("PersonaPanel.InterviewsPage");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const result = await fetchInterviewMessages(panelId, interview.id);
      if (result.success) {
        setMessages(result.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [panelId, interview.id]);

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
