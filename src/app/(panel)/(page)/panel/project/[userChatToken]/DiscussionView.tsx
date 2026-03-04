"use client";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import useSWR from "swr";
import { fetchDiscussionDetail, type PanelDiscussionDetail } from "./actions";

export function DiscussionView({
  timeline: initialTimeline,
  personas: initialPersonas,
}: PanelDiscussionDetail) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");

  // Use SWR for discussion detail polling
  const { data: discussionDetail } = useSWR(
    ["panel:discussionDetail", initialTimeline.token],
    async () => {
      const result = await fetchDiscussionDetail(initialTimeline.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: { timeline: initialTimeline, personas: initialPersonas },
      refreshInterval: (data) => (data?.timeline.summary === "" ? 5000 : 0),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const timeline = discussionDetail?.timeline ?? initialTimeline;
  const personas = discussionDetail?.personas ?? initialPersonas;
  const events = timeline.events;
  const summary = timeline.summary;
  const minutes = timeline.minutes;
  const isComplete = summary !== "";

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
      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Personas sidebar */}
        <div className="hidden md:flex flex-col w-48 lg:w-56 border-r border-border py-3 px-3">
          {/* Progress section - fixed */}
          <div className="space-y-2 pb-3 border-b border-border">
            <div className="text-xs text-muted-foreground">
              {participatedIds.size}/{personas.length} {t("participated")}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{
                  width: `${personas.length > 0 ? (participatedIds.size / personas.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Personas list header - fixed */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pt-3">
            {t("participants")}
          </div>

          {/* Personas list - scrollable */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-1 space-y-1">
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

        {/* Right: Status + Outputs */}
        <div className="hidden lg:flex flex-col w-72 border-l border-border">
          {/* Status - fixed */}
          <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("status")}
            </span>
            <div className="flex items-center gap-1.5">
              {isComplete ? (
                <>
                  <CheckCircle2 className="size-3 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("complete")}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="size-3 animate-spin text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("inProgress")}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tabs - all tabs visible */}
          <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border justify-start shrink-0">
              {summary && (
                <TabsTrigger
                  value="summary"
                  className="text-xs font-medium uppercase tracking-wide py-2.5 px-3 rounded-none border-b border-transparent data-[state=active]:border-foreground/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("summary")}
                </TabsTrigger>
              )}
              {minutes && (
                <TabsTrigger
                  value="minutes"
                  className="text-xs font-medium uppercase tracking-wide py-2.5 px-3 rounded-none border-b border-transparent data-[state=active]:border-foreground/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("minutes")}
                </TabsTrigger>
              )}
              <TabsTrigger
                value="artifacts"
                className="text-xs font-medium uppercase tracking-wide py-2.5 px-3 rounded-none border-b border-transparent data-[state=active]:border-foreground/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
              >
                Artifacts
              </TabsTrigger>
            </TabsList>

            {/* Tab contents - scrollable */}
            {summary && (
              <TabsContent
                value="summary"
                className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 mt-0 text-xs leading-relaxed"
              >
                <Streamdown mode="static">{summary}</Streamdown>
              </TabsContent>
            )}
            {minutes && (
              <TabsContent
                value="minutes"
                className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 mt-0 text-xs leading-relaxed"
              >
                <Streamdown mode="static">{minutes}</Streamdown>
              </TabsContent>
            )}
            <TabsContent
              value="artifacts"
              className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 mt-0 text-xs text-muted-foreground/60 italic"
            >
              {t("artifactsPlaceholder")}
            </TabsContent>
          </Tabs>
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
            <Streamdown mode="static">{event.content}</Streamdown>
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
            <Streamdown mode="static">{event.content}</Streamdown>
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
            <Streamdown mode="static">{event.content}</Streamdown>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "moderator-selection") {
    return (
      <div className="flex items-center gap-3">
        <div className="shrink-0 size-8 flex items-center justify-center">🎯</div>
        <div className="flex-1 text-xs text-muted-foreground">
          Moderator selected: <strong>{event.selectedPersonaName}</strong>
          {event.reasoning && ` - ${event.reasoning}`}
        </div>
      </div>
    );
  }

  return null;
}
