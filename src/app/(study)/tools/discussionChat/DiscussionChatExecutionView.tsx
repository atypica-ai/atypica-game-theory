"use client";

import { fetchDiscussionTimeline } from "@/app/(panel)/(page)/panel/project/actions";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { ToolUIPart } from "ai";
import { Streamdown } from "streamdown";
import useSWR from "swr";

export function DiscussionChatExecutionView({
  toolInvocation,
  polling = true,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.discussionChat>>;
  polling?: boolean;
}) {
  const timelineToken =
    toolInvocation.state === "output-available"
      ? toolInvocation.output.timelineToken
      : (toolInvocation.input?.timelineToken ?? null);

  const isToolRunning =
    toolInvocation.state === "input-available" || toolInvocation.state === "input-streaming";

  const { data } = useSWR(
    timelineToken ? ["discussionTimeline", timelineToken] : null,
    async () => {
      const result = await fetchDiscussionTimeline(timelineToken!);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data.events;
    },
    {
      refreshInterval: isToolRunning && polling ? 5000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const timelineEvents = data ?? [];
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  if (isToolRunning && timelineEvents.length === 0) {
    return (
      <div className="font-mono text-sm flex items-center gap-2">
        <span className="animate-bounce">✨</span>
        <span>Starting discussion...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-stretch justify-start w-full h-full">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 scrollbar-thin">
        {timelineEvents.map((event, index) => {
          if (event.type === "question") {
            return (
              <div key={`${event.type}-${index}`} className="flex items-start gap-3">
                <div className="rounded-md bg-background border size-8 flex items-center justify-center shrink-0">
                  💬
                </div>
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Question</div>
                  <div className="text-xs">
                    <Streamdown mode="static">{event.content}</Streamdown>
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
                  <div className="text-xs">
                    <Streamdown mode="static">{event.content}</Streamdown>
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
                  <div className="text-xs">
                    <Streamdown mode="static">{event.content}</Streamdown>
                  </div>
                </div>
              </div>
            );
          }

          if (event.type === "moderator-selection") {
            return (
              <div key={`${event.type}-${index}`} className="flex items-center gap-3">
                <div className="shrink-0 size-8 flex items-center justify-center">🎯</div>
                <div className="flex-1 text-xs text-muted-foreground">
                  Moderator selected: <strong>{event.selectedPersonaName}</strong>
                  {event.reasoning && ` - ${event.reasoning}`}
                </div>
              </div>
            );
          }

          return null;
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
