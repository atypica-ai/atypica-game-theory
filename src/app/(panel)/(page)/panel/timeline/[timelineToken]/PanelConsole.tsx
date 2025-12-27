"use client";

import { fetchDiscussionTimeline } from "@/app/(panel)/(page)/actions";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Markdown } from "@/components/markdown";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useCallback, useEffect, useState } from "react";

export function PanelConsole({ timelineToken }: { timelineToken: string }) {
  const [timelineEvents, setTimelineEvents] = useState<DiscussionTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    try {
      const result = await fetchDiscussionTimeline(timelineToken);
      if (!result.success) throw result;
      setTimelineEvents(result.data.events);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching panel timeline:", error);
      setIsLoading(false);
    }
  }, [timelineToken]);

  // Poll database for updates
  useEffect(() => {
    fetchTimeline();

    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000); // Poll every 5 seconds
      await fetchTimeline();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchTimeline]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  if (isLoading && timelineEvents.length === 0) {
    return (
      <div className="font-mono text-sm flex items-center gap-2">
        <span className="animate-bounce">✨</span>
        <span>Loading panel discussion...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-stretch justify-start w-full h-full">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 scrollbar-thin min-h-[600px] border rounded-lg p-4"
      >
        {timelineEvents.length === 0 ? (
          <div className="text-sm text-muted-foreground">Panel discussion is starting...</div>
        ) : (
          timelineEvents.map((event, index) => {
            if (event.type === "question") {
              return (
                <div key={`${event.type}-${index}`} className="flex items-start gap-3">
                  <div className="rounded-md bg-background border size-8 flex items-center justify-center shrink-0">
                    💬
                  </div>
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {event.author === "user" ? "Core Question" : "Moderator Question"}
                    </div>
                    <div className="text-sm">
                      <Markdown>{event.content}</Markdown>
                    </div>
                  </div>
                </div>
              );
            }

            if (event.type === "persona-reply") {
              return (
                <div
                  key={`${event.type}-${event.personaId}-${index}`}
                  className="flex items-start gap-3"
                >
                  <HippyGhostAvatar seed={event.personaId} className="size-8 shrink-0" />
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {event.personaName}
                    </div>
                    <div className="text-sm">
                      <Markdown>{event.content}</Markdown>
                    </div>
                  </div>
                </div>
              );
            }

            if (event.type === "moderator") {
              return (
                <div key={`${event.type}-${index}`} className="flex items-start gap-3">
                  <div className="rounded-md bg-background border size-8 flex items-center justify-center shrink-0">
                    📝
                  </div>
                  <div className="flex-1 bg-accent/40 rounded-lg p-4 border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Moderator Summary
                    </div>
                    <div className="text-sm">
                      <Markdown>{event.content}</Markdown>
                    </div>
                  </div>
                </div>
              );
            }

            if (event.type === "moderator-selection") {
              return (
                <div
                  key={`${event.type}-${index}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span>🎯</span>
                  <span>
                    Moderator selected: <strong>{event.selectedPersonaName}</strong>
                    {event.reasoning && ` - ${event.reasoning}`}
                  </span>
                </div>
              );
            }

            return null;
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
