"use client";

import type { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Streamdown } from "streamdown";

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs leading-relaxed bg-zinc-50 dark:bg-zinc-900 border rounded-md p-3 overflow-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function DiscussionTimelineEventItem({ event }: { event: DiscussionTimelineEvent }) {
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>🎯</span>
        <span>
          Moderator selected: <strong>{event.selectedPersonaName}</strong>
          {event.reasoning ? ` - ${event.reasoning}` : ""}
        </span>
      </div>
    );
  }

  return null;
}
