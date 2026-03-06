"use client";

import { UniversalSubAgentToolPartDisplay } from "@/app/(universal)/universal/components/UniversalSubAgentToolPartDisplay";
import { useTaskDetailPolling } from "@/app/(universal)/universal/components/task-detail/useTaskDetailPolling";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import {
  UniversalSubAgentToolPartVM,
  UniversalTaskVM,
  UniversalTimelineStage,
  extractSubAgentToolPartsFromMessages,
} from "@/app/(universal)/universal/task-vm";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, CircleDot, CircleX, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

function statusLabel(state: UniversalSubAgentToolPartVM["state"]): "running" | "done" | "error" {
  if (state === "output-error") return "error";
  if (state === "output-available") return "done";
  return "running";
}

function StatusIcon({ state }: { state: UniversalSubAgentToolPartVM["state"] }) {
  const status = statusLabel(state);
  if (status === "running") return <CircleDot className="size-3.5 text-amber-500 animate-pulse" />;
  if (status === "done") return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  return <CircleX className="size-3.5 text-red-500" />;
}

function stageClassName(stage: UniversalTimelineStage) {
  if (stage === "discovery") {
    return "border-cyan-300/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  }
  if (stage === "interview") {
    return "border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (stage === "delivery") {
    return "border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "border-violet-300/40 bg-violet-500/10 text-violet-700 dark:text-violet-300";
}

const EXECUTION_LOADING_GRID_COLS = 10;
const EXECUTION_LOADING_GRID_ROWS = 8;
const EXECUTION_LOADING_PATH_A = [
  { row: 2, col: 1 },
  { row: 3, col: 2 },
  { row: 5, col: 2 },
  { row: 6, col: 3 },
  { row: 5, col: 5 },
  { row: 2, col: 6 },
  { row: 1, col: 8 },
  { row: 2, col: 6 },
  { row: 5, col: 5 },
  { row: 6, col: 9 },
] as const;
const EXECUTION_LOADING_PATH_B = [
  { row: 6, col: 9 },
  { row: 6, col: 3 },
  { row: 5, col: 2 },
  { row: 3, col: 2 },
  { row: 2, col: 1 },
  { row: 2, col: 6 },
  { row: 5, col: 5 },
  { row: 2, col: 6 },
  { row: 1, col: 8 },
] as const;
const EXECUTION_LOADING_TRAIL_LEVELS = [1, 0.72, 0.48, 0.3] as const;

function buildGridGlowMap(phase: number): Map<string, number> {
  const map = new Map<string, number>();
  const applyTrail = (
    path: ReadonlyArray<{ row: number; col: number }>,
    step: number,
    phaseOffset = 0,
  ) => {
    const length = path.length;
    const headIndex = (phase * step + phaseOffset) % length;
    EXECUTION_LOADING_TRAIL_LEVELS.forEach((level, offset) => {
      const point = path[(headIndex - offset + length) % length];
      const key = `${point.row}-${point.col}`;
      map.set(key, Math.max(map.get(key) ?? 0, level));
    });
  };
  applyTrail(EXECUTION_LOADING_PATH_A, 1, 0);
  applyTrail(EXECUTION_LOADING_PATH_B, 2, 1);
  return map;
}

function ExecutionGridLoader({ label }: { label: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((prev) => prev + 1);
    }, 220);
    return () => window.clearInterval(timer);
  }, []);

  const glowMap = useMemo(() => buildGridGlowMap(phase), [phase]);

  return (
    <div className="relative px-1 pt-2 pb-1">
      <div className="pointer-events-none absolute inset-x-6 top-1 h-[232px] rounded-[28px] border border-border/45 bg-background/20" />
      <div className="pointer-events-none absolute inset-x-3 top-3 h-[232px] rounded-[28px] border border-border/60 bg-background/30" />

      <div className="relative rounded-[28px] border border-border/70 bg-background/85 p-4 backdrop-blur-sm">
        <div className="execution-grid-scan pointer-events-none absolute inset-y-6 left-0 w-[38%] rounded-[20px]" />
        <div className="mx-auto w-full max-w-[360px]">
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${EXECUTION_LOADING_GRID_COLS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: EXECUTION_LOADING_GRID_ROWS * EXECUTION_LOADING_GRID_COLS }).map(
              (_, index) => {
                const row = Math.floor(index / EXECUTION_LOADING_GRID_COLS);
                const col = index % EXECUTION_LOADING_GRID_COLS;
                const cellKey = `${row}-${col}`;
                const glow = glowMap.get(cellKey) ?? 0;
                const spark = (row * 11 + col * 17 + phase * 3) % 37 === 0 ? 0.22 : 0;
                const intensity = Math.min(1, glow + spark);
                return (
                  <div
                    key={cellKey}
                    className={cn(
                      "aspect-square rounded-[2px] border border-dashed border-zinc-400/55 transition-all duration-200 dark:border-zinc-600/60",
                      intensity > 0.06 &&
                        "border-sky-200/85 bg-[linear-gradient(180deg,rgba(147,197,253,0.72)_0%,rgba(167,243,208,0.62)_100%)] dark:border-emerald-300/65",
                    )}
                    style={{ opacity: 0.28 + intensity * 0.72 }}
                  />
                );
              },
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>{label}</span>
      </div>
      <style jsx>{`
        .execution-grid-scan {
          background: linear-gradient(
            90deg,
            rgba(56, 189, 248, 0) 0%,
            rgba(56, 189, 248, 0.08) 30%,
            rgba(52, 211, 153, 0.18) 50%,
            rgba(56, 189, 248, 0.08) 70%,
            rgba(56, 189, 248, 0) 100%
          );
          animation: execution-grid-scan 2.8s ease-in-out infinite;
        }

        @keyframes execution-grid-scan {
          0% {
            transform: translateX(-130%);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          85% {
            opacity: 0.85;
          }
          100% {
            transform: translateX(300%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

type SubAgentChatMessage = {
  id: string;
  role: string;
  parts: unknown[];
};

type TaskDetailCache = {
  parts: UniversalSubAgentToolPartVM[];
};

export function UniversalTaskDetailPanel({
  task,
}: {
  task: UniversalTaskVM | null;
}) {
  const t = useTranslations("UniversalAgent");
  const [subAgentParts, setSubAgentParts] = useState<UniversalSubAgentToolPartVM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taskCacheByToken, setTaskCacheByToken] = useState<Record<string, TaskDetailCache>>({});
  const [openStepByToolCallId, setOpenStepByToolCallId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenStepByToolCallId({});
  }, [task?.subAgentChatToken]);

  useEffect(() => {
    const token = task?.subAgentChatToken;
    if (!token) {
      setSubAgentParts([]);
      setIsLoading(false);
      return;
    }

    const cached = taskCacheByToken[token];
    if (cached) {
      setSubAgentParts(cached.parts);
      setIsLoading(false);
      return;
    }

    setSubAgentParts([]);
    setIsLoading(true);
  }, [task?.subAgentChatToken, taskCacheByToken]);

  useTaskDetailPolling({
    enabled: !!task?.subAgentChatToken,
    fetcher: async () => {
      if (!task?.subAgentChatToken) return null;
      const chatResult = await fetchUniversalUserChatByToken(task.subAgentChatToken);

      if (!chatResult.success) {
        return {
          token: task.subAgentChatToken,
          parts: [] as UniversalSubAgentToolPartVM[],
        };
      }

      const messages = chatResult.data.messages as SubAgentChatMessage[];
      return {
        token: task.subAgentChatToken,
        parts: extractSubAgentToolPartsFromMessages(messages),
      };
    },
    onData: (next) => {
      setIsLoading(false);
      setSubAgentParts(next.parts);
      setTaskCacheByToken((prev) => ({
        ...prev,
        [next.token]: { parts: next.parts },
      }));
      setOpenStepByToolCallId((prev) => {
        const validPrev = Object.fromEntries(
          Object.entries(prev).filter(([toolCallId]) =>
            next.parts.some((part) => part.toolCallId === toolCallId),
          ),
        );
        if (Object.keys(validPrev).length > 0) {
          return validPrev;
        }
        for (let i = next.parts.length - 1; i >= 0; i -= 1) {
          if (statusLabel(next.parts[i].state) === "running") {
            return { [next.parts[i].toolCallId]: true };
          }
        }
        const latestPart = next.parts[next.parts.length - 1];
        return latestPart ? { [latestPart.toolCallId]: true } : {};
      });
    },
    shouldContinue: () => task?.status === "running",
    onError: () => setIsLoading(false),
  });

  const stageLabelMap: Record<UniversalTimelineStage, string> = useMemo(
    () => ({
      discovery: t("executionStageDiscovery"),
      interview: t("executionStageInterview"),
      synthesis: t("executionStageSynthesis"),
      delivery: t("executionStageDelivery"),
    }),
    [t],
  );

  if (!task) {
    return (
      <section className="h-full p-4">
        <div className="text-sm text-muted-foreground">{t("executionSelectTask")}</div>
      </section>
    );
  }

  if (!task.subAgentChatToken) {
    return (
      <section className="h-full p-4">
        <div className="text-sm text-muted-foreground">{t("executionSubAgentNotReady")}</div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-zinc-500" />
          <div className="text-sm font-medium">{t("executionTimelineTitle")}</div>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1">{task.title}</div>
        {/* Intentionally hide task chips in detail panel; task selection stays in middle list panel. */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {subAgentParts.length === 0 ? (
          isLoading ? (
            <ExecutionGridLoader label={t("executionLoading")} />
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {task.status === "running" ? t("executionWaitingFirstStep") : t("executionNoSteps")}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {subAgentParts.map((part, index) => {
              const isOpen = !!openStepByToolCallId[part.toolCallId];
              const isLast = index === subAgentParts.length - 1;
              const status = statusLabel(part.state);
              const isRunning = status === "running";
              return (
                <div key={`${part.toolCallId}-${part.messageIndex}-${part.partIndex}`} className="relative pl-8">
                  {!isLast ? (
                    <span
                      className={cn(
                        "absolute left-[10px] top-6 bottom-[-20px] w-px bg-border/80",
                        isRunning && "bg-amber-400/60",
                      )}
                    />
                  ) : null}
                  <span className="absolute left-0 top-1 inline-flex size-5 items-center justify-center rounded-full border bg-background">
                    <StatusIcon state={part.state} />
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenStepByToolCallId((prev) => ({
                        ...prev,
                        [part.toolCallId]: !prev[part.toolCallId],
                      }))
                    }
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2 transition-colors",
                      isOpen
                        ? "bg-zinc-100/70 dark:bg-zinc-800/70"
                        : "bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          stageClassName(part.stage),
                        )}
                      >
                        {stageLabelMap[part.stage]}
                      </span>
                      <span className="text-sm font-medium truncate">{part.semanticTitle}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto size-3.5 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="mt-2 rounded-lg border bg-muted/10 p-3 space-y-3">
                      <UniversalSubAgentToolPartDisplay
                        selectedPart={part}
                        studyUserChatToken={task.subAgentChatToken ?? undefined}
                      />
                      <details className="rounded-md border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">
                          {t("executionTechDetails")}
                        </summary>
                        <div className="mt-2 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 break-all">
                          <span className="text-foreground/80">tool</span>
                          <span>{part.toolName}</span>
                          <span className="text-foreground/80">state</span>
                          <span>{part.state}</span>
                          <span className="text-foreground/80">callId</span>
                          <span>{part.toolCallId}</span>
                        </div>
                      </details>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
