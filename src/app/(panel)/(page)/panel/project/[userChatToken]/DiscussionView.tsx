"use client";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import type { PanelDiscussionDetail } from "./actions";
import { fetchDiscussionTimeline } from "./actions";

export function DiscussionView({ timeline: initialTimeline, personas }: PanelDiscussionDetail) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");
  const [events, setEvents] = useState<DiscussionTimelineEvent[]>(initialTimeline.events);
  const [summary, setSummary] = useState(initialTimeline.summary);
  const [minutes, setMinutes] = useState(initialTimeline.minutes);
  const isComplete = summary !== "";

  // Poll for updates
  const fetchUpdate = useCallback(async () => {
    try {
      const result = await fetchDiscussionTimeline(initialTimeline.token);
      if (!result.success) return;
      setEvents(result.data.events);
      if (result.data.summary) setSummary(result.data.summary);
      if ("minutes" in result.data && typeof result.data.minutes === "string") {
        setMinutes(result.data.minutes);
      }
    } catch {
      // silently ignore polling errors
    }
  }, [initialTimeline.token]);

  useEffect(() => {
    if (isComplete) return;
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      await fetchUpdate();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchUpdate, isComplete]);

  // Track which personas have spoken
  const participatedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const event of events) {
      if (event.type === "persona-reply") {
        ids.add(event.personaId);
      }
    }
    return ids;
  }, [events]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3">
        {isComplete ? (
          <Badge variant="outline" className="text-xs font-normal gap-1 border-green-500/30">
            <CheckCircle2 className="size-3 text-green-500" />
            {t("complete")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <Loader2 className="size-3 animate-spin" />
            {t("inProgress")}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {participatedIds.size}/{personas.length} {t("participants")}
        </span>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Personas sidebar */}
        <div className="hidden md:flex flex-col w-48 lg:w-56 border-r border-border overflow-y-auto scrollbar-thin py-3 px-3 gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">
            {t("participants")}
          </div>
          {personas.map((persona) => {
            const participated = participatedIds.has(persona.id);
            return (
              <div
                key={persona.id}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm",
                  participated ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                <HippyGhostAvatar seed={persona.id} className="size-6 shrink-0" />
                <span className="truncate text-xs flex-1">{persona.name}</span>
                {participated ? (
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground/30 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Center: Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-4"
          >
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {t("starting")}
              </div>
            ) : (
              events.map((event, index) => (
                <TimelineEvent key={`${event.type}-${index}`} event={event} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right: Summary & Analysis */}
        <div className="hidden lg:flex flex-col w-72 border-l border-border overflow-y-auto scrollbar-thin py-4 px-4 gap-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("analysis")}
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("participants")}</span>
              <span className="font-medium tabular-nums">
                {participatedIds.size}/{personas.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("events")}</span>
              <span className="font-medium tabular-nums">{events.length}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{
                  width: `${personas.length > 0 ? (participatedIds.size / personas.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("summary")}
              </div>
              <div className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3 border">
                <Streamdown>{summary}</Streamdown>
              </div>
            </div>
          )}

          {/* Minutes */}
          {minutes && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("minutes")}
              </div>
              <div className="text-xs leading-relaxed bg-muted/50 rounded-lg p-3 border">
                <Streamdown>{minutes}</Streamdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Render a single timeline event */
function TimelineEvent({ event }: { event: DiscussionTimelineEvent }) {
  if (event.type === "question") {
    return (
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-background border size-8 flex items-center justify-center shrink-0 text-sm">
          💬
        </div>
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {event.author === "user" ? "Core Question" : "Moderator Question"}
          </div>
          <div className="text-sm">
            <Streamdown>{event.content}</Streamdown>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "persona-reply") {
    return (
      <div className="flex items-start gap-3">
        <HippyGhostAvatar seed={event.personaId} className="size-8 shrink-0" />
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border">
          <div className="text-xs font-medium text-muted-foreground mb-1">{event.personaName}</div>
          <div className="text-sm">
            <Streamdown>{event.content}</Streamdown>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "moderator") {
    return (
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-background border size-8 flex items-center justify-center shrink-0 text-sm">
          📝
        </div>
        <div className="flex-1 bg-accent/40 rounded-lg p-4 border">
          <div className="text-xs font-medium text-muted-foreground mb-1">Moderator Summary</div>
          <div className="text-sm">
            <Streamdown>{event.content}</Streamdown>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "moderator-selection") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>🎯</span>
        <span>
          Moderator selected: <strong>{event.selectedPersonaName}</strong>
          {event.reasoning && ` - ${event.reasoning}`}
        </span>
      </div>
    );
  }

  return null;
}
