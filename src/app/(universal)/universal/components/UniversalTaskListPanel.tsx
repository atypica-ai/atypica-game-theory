"use client";

import { UniversalTaskStatus, UniversalTaskVM } from "@/app/(universal)/universal/task-vm";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, CircleDotIcon, CircleXIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

function StatusIcon({ status }: { status: UniversalTaskStatus }) {
  if (status === "running") return <CircleDotIcon className="size-3.5 text-amber-500 animate-pulse" />;
  if (status === "done") return <CheckCircle2Icon className="size-3.5 text-emerald-500" />;
  return <CircleXIcon className="size-3.5 text-red-500" />;
}

function StatusBadge({ status }: { status: UniversalTaskStatus }) {
  const t = useTranslations("UniversalAgent");
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-300 animate-pulse" />
        {t("statusInProgress")}
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        {t("statusCompleted")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-300/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
      {t("statusNeedsAttention")}
    </span>
  );
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
  const t = useTranslations("UniversalAgent");
  return (
    <section className="h-full overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b bg-[linear-gradient(90deg,rgba(24,24,27,0.06)_0%,rgba(24,24,27,0.02)_38%,transparent_100%)] dark:bg-[linear-gradient(90deg,rgba(244,244,245,0.08)_0%,rgba(244,244,245,0.02)_38%,transparent_100%)]">
        <div className="text-sm font-medium flex items-center gap-2">
          <SparklesIcon className="size-3.5 text-zinc-500 dark:text-zinc-400" />
          {t("workflowTitle")}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-xs text-muted-foreground p-4">{t("workflowEmpty")}</div>
        ) : (
          tasks.map((task) => {
            const selected = task.toolCallId === selectedTaskCallId;
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
                    {t("workflowTag")}
                  </div>
                </div>
                <div className="relative z-10 mt-2 flex items-start gap-2">
                  <StatusIcon status={task.status} />
                  <div className="text-sm font-semibold leading-5 line-clamp-1">{task.title}</div>
                </div>
                <div className="relative z-10 mt-1 text-[11px] text-muted-foreground line-clamp-1">
                  {task.summary ||
                    (task.status === "running" ? t("processing") : t("noUpdateYet"))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
