"use client";

import type { DiscussionTimelineEvent } from "@/app/(panel)/types";
import type { UniversalTaskVM } from "@/app/(universal)/universal/task-vm";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  fetchDiscussionDetailData,
  fetchInterviewDetailData,
  fetchReportDetailData,
  getDiscussionTimelineToken,
  getInterviewPersonas,
  getReportToken,
} from "./task-detail/adapters";
import { DiscussionTimelineEventItem, JsonBlock } from "./task-detail/ui";
import { useTaskDetailPolling } from "./task-detail/useTaskDetailPolling";

function DiscussionDetail({ task }: { task: UniversalTaskVM }) {
  const isRunning = task.status === "running";
  const timelineToken = useMemo(() => getDiscussionTimelineToken(task), [task]);
  const [events, setEvents] = useState<DiscussionTimelineEvent[]>([]);

  useEffect(() => {
    setEvents([]);
  }, [timelineToken]);

  useTaskDetailPolling({
    enabled: !!timelineToken,
    fetcher: () => fetchDiscussionDetailData({ timelineToken, isRunning }),
    onData: (data) => setEvents(data.events),
    shouldContinue: (data) => data.shouldContinue,
  });

  return (
    <div className="flex flex-col h-full -mx-4 -my-4 overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-4">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center justify-center h-full gap-2">
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Starting discussion...
              </>
            ) : (
              "No timeline data"
            )}
          </div>
        ) : (
          events.map((event, index) => (
            <DiscussionTimelineEventItem key={`${event.type}-${index}`} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

function InterviewDetail({
  task,
  userChatToken,
}: {
  task: UniversalTaskVM;
  userChatToken: string;
}) {
  const isRunning = task.status === "running";
  const personas = useMemo(() => getInterviewPersonas(task), [task]);
  const [data, setData] = useState<
    Record<number, { conclusion: string; messages: Array<{ role: string; text: string }> }>
  >({});
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(
    personas[0]?.id ?? null,
  );

  useEffect(() => {
    setData({});
    setSelectedPersonaId(personas[0]?.id ?? null);
  }, [personas]);

  useEffect(() => {
    if (!personas.length) return;
    if (
      selectedPersonaId !== null &&
      personas.some((persona) => persona.id === selectedPersonaId)
    ) {
      return;
    }
    setSelectedPersonaId(personas[0].id);
  }, [personas, selectedPersonaId]);

  useTaskDetailPolling({
    enabled: personas.length > 0,
    fetcher: () => fetchInterviewDetailData({ personas, userChatToken, isRunning }),
    onData: (next) => setData(next.dataByPersonaId),
    shouldContinue: (next) => next.shouldContinue,
  });

  if (!personas.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No persona input found for this interview task.
      </div>
    );
  }

  const selectedData = selectedPersonaId ? data[selectedPersonaId] : null;

  return (
    <div className="flex-1 flex overflow-hidden -mx-4 -my-4 h-full">
      <div className="flex flex-col w-48 lg:w-56 border-r border-border py-3 px-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pb-2 mb-2 border-b border-border">
          Participants ({personas.length})
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
          {personas.map((persona) => {
            const isActive = selectedPersonaId === persona.id;
            const hasData = !!data[persona.id]?.messages?.length;
            const hasConclusion = !!data[persona.id]?.conclusion;
            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersonaId(persona.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm border border-border"
                    : "text-muted-foreground/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-foreground border border-transparent",
                )}
              >
                <HippyGhostAvatar seed={persona.id} className="size-6 shrink-0" />
                <span className="truncate text-xs flex-1 font-medium">{persona.name}</span>
                {hasConclusion ? (
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                ) : hasData || isRunning ? (
                  <Loader2 className="size-3.5 text-muted-foreground/30 animate-spin shrink-0" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground/30 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
        {selectedPersonaId ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-6">
            {selectedData?.conclusion ? (
              <div className="bg-accent/40 rounded-lg p-4 border text-sm">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  📝 Interview Conclusion
                </div>
                <Streamdown mode="static">{selectedData.conclusion}</Streamdown>
              </div>
            ) : null}

            <div className="space-y-4">
              {(selectedData?.messages || []).length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {isRunning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Interviewing...
                    </>
                  ) : (
                    "No messages yet."
                  )}
                </div>
              ) : (
                (selectedData?.messages || []).map((message, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {message.role === "assistant" ? (
                      <div className="rounded-md bg-zinc-100 dark:bg-zinc-800 border size-8 flex items-center justify-center shrink-0 text-sm">
                        💬
                      </div>
                    ) : (
                      <HippyGhostAvatar seed={selectedPersonaId} className="size-8 shrink-0" />
                    )}
                    <div
                      className={cn(
                        "flex-1 rounded-lg p-4 border",
                        message.role === "assistant"
                          ? "bg-zinc-50 dark:bg-zinc-900/50"
                          : "bg-white dark:bg-zinc-800/80 shadow-sm",
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                        {message.role === "assistant"
                          ? "Interviewer"
                          : personas.find((p) => p.id === selectedPersonaId)?.name}
                      </div>
                      <div className="text-sm">
                        <Streamdown mode="static">{message.text}</Streamdown>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a participant to view interview
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDetail({ task }: { task: UniversalTaskVM }) {
  const isRunning = task.status === "running";
  const reportToken = useMemo(() => getReportToken(task), [task]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    setGeneratedAt(null);
  }, [reportToken]);

  useTaskDetailPolling({
    enabled: !!reportToken,
    fetcher: () => fetchReportDetailData({ reportToken, isRunning }),
    onData: (next) => setGeneratedAt(next.generatedAt),
    shouldContinue: (next) => next.shouldContinue,
  });

  if (!reportToken) {
    return <div className="text-sm text-muted-foreground">No report token found.</div>;
  }

  return (
    <div className="h-full min-h-[360px] flex flex-col gap-2">
      <iframe
        src={`/artifacts/report/${reportToken}/raw?live=1`}
        className="w-full flex-1 bg-white"
      />
    </div>
  );
}

export function UniversalTaskDetailPanel({
  task,
  userChatToken,
}: {
  task: UniversalTaskVM | null;
  userChatToken: string;
}) {
  if (!task) {
    return (
      <section className="h-full p-4">
        <div className="text-sm text-muted-foreground">Select a task to view details.</div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="text-sm font-medium line-clamp-2">{task.title}</div>
      </div>
      <div
        className={cn("flex-1 overflow-auto p-4 space-y-4", task.kind === "report" ? "pb-8" : "")}
      >
        {task.kind === "focusGroup" ? <DiscussionDetail task={task} /> : null}
        {task.kind === "interview" ? (
          <InterviewDetail task={task} userChatToken={userChatToken} />
        ) : null}
        {task.kind === "report" ? <ReportDetail task={task} /> : null}
        {task.kind !== "focusGroup" && task.kind !== "interview" && task.kind !== "report" ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Input</div>
              <JsonBlock value={task.part.input} />
            </div>
            {task.part.state === "output-available" ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Output</div>
                <JsonBlock value={task.part.output} />
              </div>
            ) : null}
            {task.part.state === "output-error" ? (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-xs">
                {task.part.errorText}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
