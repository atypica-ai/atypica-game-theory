"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import type { Persona } from "@/prisma/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { fetchDiscussionDetail, type PanelDiscussionDetail } from "../actions";
import { DiscussionSidebar } from "./DiscussionSidebar";
import { TimelineEvent } from "./TimelineEvent";

export interface SelectorItem {
  label: string;
  icon: "discussion" | "interview";
}

export interface DiscussionViewProps extends PanelDiscussionDetail {
  panel: { id: number; title: string };
  project: { token: string; title: string };
  /** Research item selector — passed when multiple items exist */
  selector?: {
    items: SelectorItem[];
    selectedIndex: number;
    onSelect: (index: number) => void;
  };
}

export function DiscussionView({
  timeline: initialTimeline,
  personas: initialPersonas,
  panel,
  project,
  selector,
}: DiscussionViewProps) {
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
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Persona list */}
      <div className="hidden md:flex flex-col w-48 lg:w-56 border-r border-border py-4 px-4 gap-5">
        {/* Research item selector */}
        {selector && (
          <Select
            value={String(selector.selectedIndex)}
            onValueChange={(value) => selector.onSelect(Number(value))}
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selector.items.map((item, index) => (
                <SelectItem key={index} value={String(index)} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
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

        {/* Personas list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className={cn(
                "flex items-center gap-2.5 rounded-md",
                participatedIds.has(persona.id) ? "opacity-100" : "opacity-40",
              )}
            >
              <HippyGhostAvatar seed={persona.id} className="size-7 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs font-medium">{persona.name}</span>
                {persona.extra?.title && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {persona.extra.title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating header bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 lg:px-6 py-3 bg-background/60 backdrop-blur-sm">
          {/* Left: Back */}
          <Link
            href={`/panel/${panel.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            {panel.title}
          </Link>

          {/* Center: Title */}
          <div className="flex-1 text-center min-w-0 px-4">
            <h1 className="text-sm font-medium truncate">{project.title}</h1>
          </div>

          {/* Right: Status badge */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border/50 bg-background/40 shrink-0">
            <div
              className={
                isComplete
                  ? "size-2 rounded-full bg-muted-foreground/30"
                  : "size-2 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse"
              }
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isComplete ? t("complete") : t("inProgress")}
            </span>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin pt-30 pb-6 lg:pt-30 lg:pb-10"
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

      {/* Right: Sidebar */}
      <DiscussionSidebar
        summary={summary}
        minutes={minutes}
        isComplete={isComplete}
        projectToken={project.token}
      />
    </div>
  );
}
