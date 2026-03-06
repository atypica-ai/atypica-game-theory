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
import type { PersonaExtra } from "@/prisma/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { fetchDiscussionDetail } from "../actions";
import { DiscussionSidebar } from "./DiscussionSidebar";
import { TimelineEvent } from "./TimelineEvent";

export function DiscussionView({
  timelineToken,
  panel,
  project,
  selector,
}: {
  timelineToken: string;
  panel: { id: number; title: string };
  project: { token: string; title: string };
  selector?: {
    items: { label: string }[];
    selectedIndex: number;
    onSelect: (index: number) => void;
  };
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");

  // Fetch discussion detail (timeline + personas)
  const { data: discussionDetail } = useSWR(
    ["panel:discussionDetail", timelineToken],
    async () => {
      const result = await fetchDiscussionDetail(timelineToken);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: (data) => (data?.timeline.summary === "" ? 5000 : 0),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const events = useMemo(
    () => discussionDetail?.timeline.events ?? [],
    [discussionDetail?.timeline.events],
  );
  const summary = discussionDetail?.timeline.summary ?? "";
  const minutes = discussionDetail?.timeline.minutes ?? "";
  const personas = useMemo(() => discussionDetail?.personas ?? [], [discussionDetail?.personas]);
  const isComplete = summary !== "";

  // Build persona lookup map
  const personaMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; extra: PersonaExtra }>();
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
          {/* Left 25% */}
          <div className="w-1/4 min-w-0 pr-2">
            <Link
              href={`/panel/${panel.id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 w-full truncate"
            >
              <ArrowLeft className="size-3 shrink-0" />
              <span className="truncate">{panel.title}</span>
            </Link>
          </div>

          {/* Center 50% */}
          <div className="w-1/2 text-center min-w-0">
            <h1 className="text-sm font-medium truncate">{project.title}</h1>
          </div>

          {/* Right 25% */}
          <div className="w-1/4 min-w-0 flex justify-end pl-2">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border/50 bg-background/40">
              <div
                className={
                  isComplete
                    ? "size-2 rounded-full bg-muted-foreground/30"
                    : "size-2 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse"
                }
              />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {isComplete ? t("complete") : t("inProgress")}
              </span>
            </div>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin pt-16 pb-6 lg:pb-10"
        >
          <div className="max-w-4xl mx-auto px-4 lg:px-6 space-y-12">
            {events.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t("starting")}
                </div>
              </div>
            ) : (
              events.map((event, index) => (
                <TimelineEvent
                  key={`${event.type}-${index}`}
                  event={event}
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
