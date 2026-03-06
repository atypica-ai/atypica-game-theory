"use client";

import { UniversalTaskStatus, UniversalTaskVM } from "@/app/(universal)/universal/task-vm";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, CircleDotIcon, CircleXIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function StatusIcon({ status }: { status: UniversalTaskStatus }) {
  if (status === "running") return <CircleDotIcon className="size-3.5 text-amber-500 animate-pulse" />;
  if (status === "done") return <CheckCircle2Icon className="size-3.5 text-emerald-500" />;
  return <CircleXIcon className="size-3.5 text-red-500" />;
}

function StatusBadge({ status }: { status: UniversalTaskStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-300 animate-pulse" />
        Running
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        Done
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-300/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
      Error
    </span>
  );
}

function getTaskInput(task: UniversalTaskVM): Record<string, unknown> | null {
  if (task.part.type === "dynamic-tool") return null;
  if (!task.part.input || typeof task.part.input !== "object") return null;
  return task.part.input as Record<string, unknown>;
}

function compact(value: unknown, maxLength = 120): string {
  if (typeof value === "string") {
    const normalized = stripMarkdown(value).replace(/\s+/g, " ").trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === "object") return "Object";
  return "";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^[\s>*-]+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .trim();
}

function TypewriterText({
  text,
  animate = true,
  className,
}: {
  text: string;
  animate?: boolean;
  className?: string;
}) {
  const plain = useMemo(() => stripMarkdown(text), [text]);
  const [visible, setVisible] = useState(animate ? "" : plain);

  useEffect(() => {
    if (!animate) {
      setVisible(plain);
      return;
    }
    setVisible("");
    if (!plain) return;

    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setVisible(plain.slice(0, index));
      if (index >= plain.length) clearInterval(timer);
    }, 14);

    return () => clearInterval(timer);
  }, [animate, plain]);

  return <div className={className}>{visible}</div>;
}

function extractTaskParam(task: UniversalTaskVM): { title: string; detail: string } | null {
  const input = getTaskInput(task);
  if (!input) return null;

  const titleKeys = ["title", "topic", "query", "objective", "goal", "subject"] as const;
  const detailKeys = ["instruction", "prompt", "description", "brief", "context"] as const;

  const paramTitle = titleKeys.map((key) => compact(input[key])).find(Boolean) ?? "";
  const paramDetail = detailKeys.map((key) => compact(input[key], 150)).find(Boolean) ?? "";

  if (paramTitle || paramDetail) return { title: paramTitle, detail: paramDetail };
  return null;
}

export function UniversalTaskListPanel({
  tasks,
  selectedTaskCallId,
  onSelectTask,
}: {
  tasks: UniversalTaskVM[];
  selectedTaskCallId: string | null;
  onSelectTask: (toolCallId: string) => void;
}) {
  return (
    <section className="h-full overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b bg-[linear-gradient(90deg,rgba(24,24,27,0.06)_0%,rgba(24,24,27,0.02)_38%,transparent_100%)] dark:bg-[linear-gradient(90deg,rgba(244,244,245,0.08)_0%,rgba(244,244,245,0.02)_38%,transparent_100%)]">
        <div className="text-sm font-medium flex items-center gap-2">
          <SparklesIcon className="size-3.5 text-zinc-500 dark:text-zinc-400" />
          Tasks
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-xs text-muted-foreground p-4">No tasks yet</div>
        ) : (
          tasks.map((task) => {
            const selected = task.toolCallId === selectedTaskCallId;
            const param = extractTaskParam(task);
            return (
              <button
                key={task.toolCallId}
                onClick={() => onSelectTask(task.toolCallId)}
                className={cn(
                  "group relative w-full px-4 py-3 text-left border-b border-border/80 overflow-hidden",
                  "transition-colors duration-200",
                  selected
                    ? "bg-zinc-900/[0.06] dark:bg-zinc-100/[0.06]"
                    : "hover:bg-zinc-900/[0.03] dark:hover:bg-zinc-100/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-px bg-transparent transition-colors",
                    selected ? "bg-zinc-500 dark:bg-zinc-400" : "group-hover:bg-zinc-400/70 dark:group-hover:bg-zinc-500/70",
                  )}
                  aria-hidden
                />
                <div className="relative z-10 flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate ml-auto font-medium">
                    {task.kind}
                  </div>
                </div>
                <div className="relative z-10 mt-2 flex items-start gap-2">
                  <StatusIcon status={task.status} />
                  <div className="text-sm font-semibold leading-5 line-clamp-2">{task.title}</div>
                </div>
                {param ? (
                  <div className="relative z-10 mt-2 border-l border-zinc-300/60 dark:border-zinc-700 pl-2.5">
                    {param.title ? (
                      <div className="text-xs text-foreground/90 line-clamp-1">
                        <span className="text-muted-foreground mr-1">Title:</span>
                        {param.title}
                      </div>
                    ) : null}
                    {param.detail ? (
                      <TypewriterText
                        text={param.detail}
                        animate={task.status === "running"}
                        className={cn("text-[11px] text-muted-foreground line-clamp-2", param.title ? "mt-1" : "")}
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="relative z-10 mt-2 text-[11px] text-muted-foreground line-clamp-2">
                  {task.summary ? task.summary : task.status === "running" ? "Task is processing..." : "No summary."}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
