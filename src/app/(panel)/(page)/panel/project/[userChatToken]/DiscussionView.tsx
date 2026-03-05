"use client";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import type { Persona } from "@/prisma/client";
import {
  AtSign,
  BrainIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import useSWR from "swr";
import { fetchDiscussionDetail, type PanelDiscussionDetail } from "./actions";

/** Rotating Tailwind color classes for persona names (600 for light, 400 for dark) */
const PERSONA_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-amber-600 dark:text-amber-400",
  "text-teal-600 dark:text-teal-400",
  "text-rose-600 dark:text-rose-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-orange-600 dark:text-orange-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-pink-600 dark:text-pink-400",
  "text-indigo-600 dark:text-indigo-400",
];

function getPersonaColor(personaId: number): string {
  return PERSONA_COLORS[personaId % PERSONA_COLORS.length];
}

/** Character threshold for collapsible content */
const COLLAPSE_THRESHOLD = 200;

export function DiscussionView({
  timeline: initialTimeline,
  personas: initialPersonas,
}: PanelDiscussionDetail) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");

  // Expand/collapse state — only one expanded at a time
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

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

  // Build persona lookup map
  const personaMap = useMemo(() => {
    const map = new Map<number, Pick<Persona, "id" | "name" | "token" | "tags" | "extra">>();
    for (const p of personas) {
      map.set(p.id, p);
    }
    return map;
  }, [personas]);

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
            className="flex-1 overflow-y-auto scrollbar-thin py-6 lg:py-10"
          >
            <div className="max-w-4xl mx-auto px-4 lg:px-6 space-y-12">
              {events.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t("starting")}
                </div>
              ) : (
                events.map((event, index) => (
                  <TimelineEvent
                    key={`${event.type}-${index}`}
                    event={event}
                    index={index}
                    expanded={expandedIndex === index}
                    onToggle={toggleExpand}
                    personaMap={personaMap}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
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
                {t("artifacts")}
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

// ─────────────────────────────────────────────────────────────
// TimelineEvent — renders a single event in the discussion
// ─────────────────────────────────────────────────────────────

function TimelineEvent({
  event,
  index,
  expanded,
  onToggle,
  personaMap,
}: {
  event: DiscussionTimelineEvent;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
  personaMap: Map<number, Pick<Persona, "id" | "name" | "token" | "tags" | "extra">>;
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");
  // ── Question ──
  if (event.type === "question") {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-6 pt-5 pb-7">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="size-1.5 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse" />
            <span className="text-base font-semibold text-foreground">{t("atypicaModerator")}</span>
          </div>
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
          />
        </div>
      </div>
    );
  }

  // ── Persona Reply ──
  if (event.type === "persona-reply") {
    const persona = personaMap.get(event.personaId);
    const title = persona?.extra?.title;
    const colorClass = getPersonaColor(event.personaId);

    return (
      <div className="flex gap-4">
        {/* Avatar + vertical line */}
        <div className="flex flex-col items-center shrink-0">
          <HippyGhostAvatar seed={event.personaId} className="size-10" />
          <div className="w-px flex-1 mt-2 bg-linear-to-b from-border to-transparent" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("text-base font-bold", colorClass)}>{event.personaName}</span>
            {title && (
              <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/40">
                {title}
              </span>
            )}
          </div>
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
          />
        </div>
      </div>
    );
  }

  // ── Moderator (summary/transition) ──
  if (event.type === "moderator") {
    return (
      <div className="flex flex-col gap-4">
        {/* Separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            {t("aiModerator")}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {/* Summary content */}
        <div className="text-sm text-foreground/90 leading-relaxed px-2">
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
            maxLines={8}
          />
        </div>
      </div>
    );
  }

  // ── Moderator Selection ──
  if (event.type === "moderator-selection") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {/* Divider line with text in the middle */}
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-px bg-border mr-2" />
          <AtSign className="size-3 shrink-0" />
          <span className="text-xs font-semibold shrink-0 mr-1">{event.selectedPersonaName}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => onToggle(index)}
            className="text-[10px] hover:no-underline has-[>svg]:p-0 text-muted-foreground"
          >
            <BrainIcon className="size-3" /> {expanded ? t("collapseReason") : t("viewReason")}
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
          <div className="flex-1 h-px bg-border ml-2" />
        </div>
        {event.reasoning && (
          <div className="self-stretch text-center">
            {expanded && (
              <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed text-left">
                {event.reasoning}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// CollapsibleContent — text that collapses when too long
// ─────────────────────────────────────────────────────────────

function CollapsibleContent({
  content,
  expanded,
  onToggle,
  maxLines = 4,
}: {
  content: string;
  expanded: boolean;
  onToggle: () => void;
  maxLines?: number;
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");
  const isLong = content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !expanded;

  const clampClass =
    maxLines === 4
      ? "line-clamp-4"
      : maxLines === 8
        ? "line-clamp-[8]"
        : `line-clamp-[${maxLines}]`;

  return (
    <div>
      <div
        className={cn(
          "text-sm text-foreground/90 leading-relaxed",
          shouldCollapse && clampClass,
        )}
      >
        <Streamdown mode="static">{content}</Streamdown>
      </div>
      {isLong && (
        <button
          onClick={onToggle}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              {t("collapse")}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {t("expand")}
            </>
          )}
        </button>
      )}
    </div>
  );
}
