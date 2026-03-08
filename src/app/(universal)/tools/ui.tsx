"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { UpdatePanelResultMessage } from "@/app/(panel)/tools/updatePanel/UpdatePanelResultMessage";
import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { GenerateReportResultMessage } from "@/app/(study)/tools/generateReport/GenerateReportResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import { UNIVERSAL_REPORT_RETRY_DELAYS_MS } from "@/app/(universal)/universal/polling";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDot, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { TAddUniversalUIToolResult, TUniversalMessageWithTool, UniversalToolName } from "./types";
import type { UserChatContext } from "@/app/(study)/context/types";

function extractPlainText(toolUIPart: TUniversalMessageWithTool["parts"][number]): string {
  if (!("output" in toolUIPart) || !toolUIPart.output || typeof toolUIPart.output !== "object") {
    return "";
  }
  const output = toolUIPart.output;
  if ("plainText" in output && typeof output.plainText === "string") return output.plainText;
  return "";
}

function UniversalMajorTaskResultCard({
  title,
  summary,
  onOpenDetail,
}: {
  title: string;
  summary: string;
  onOpenDetail?: () => void;
}) {
  const t = useTranslations("UniversalAgent");
  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/20">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className={cn("text-sm text-muted-foreground", summary ? "line-clamp-4" : "")}>
        {summary || t("taskDoneOpenDetailsHint")}
      </div>
      {onOpenDetail ? (
        <Button type="button" size="sm" variant="outline" onClick={onOpenDetail}>
          {t("taskDetailsOpen")}
        </Button>
      ) : null}
    </div>
  );
}

function getSubAgentCardStatus(toolUIPart: SubAgentToolUIPart): "running" | "done" | "error" {
  if (toolUIPart.state === "output-error") return "error";
  if (toolUIPart.state !== "output-available") return "running";
  if (toolUIPart.output?.status === "failed") return "error";
  if (toolUIPart.output?.status === "running") return "running";
  return "done";
}

function extractSubAgentTitle(toolUIPart: SubAgentToolUIPart, fallbackTitle: string): string {
  if (toolUIPart.input?.subAgentTitle?.trim()) return toolUIPart.input.subAgentTitle.trim();
  if (toolUIPart.input?.taskRequirement?.trim()) return toolUIPart.input.taskRequirement.trim();
  return fallbackTitle;
}

function extractSubAgentSummary(
  toolUIPart: SubAgentToolUIPart,
  copy: {
    taskExecutionFailedHint: string;
    taskStartedWaitingUpdate: string;
    taskCreatedWaitingFirstUpdate: string;
  },
): string {
  if (toolUIPart.state === "output-error") {
    return toolUIPart.errorText || copy.taskExecutionFailedHint;
  }
  if (toolUIPart.state !== "output-available") return copy.taskStartedWaitingUpdate;
  const resultSummary = toolUIPart.output?.resultSummary?.trim();
  return resultSummary || copy.taskCreatedWaitingFirstUpdate;
}

type SubAgentToolUIPart = Extract<
  TUniversalMessageWithTool["parts"][number],
  { type: `tool-${UniversalToolName.createSubAgent}` }
>;

function getSubAgentStatusLabel(
  status: "running" | "done" | "error",
  labels: {
    running: string;
    done: string;
    error: string;
  },
): string {
  if (status === "running") return labels.running;
  if (status === "done") return labels.done;
  return labels.error;
}

function UniversalSubAgentTaskCard({
  toolUIPart,
  onOpenDetail,
  statusOverride,
}: {
  toolUIPart: SubAgentToolUIPart;
  onOpenDetail: () => void;
  statusOverride?: "running" | "done" | "error";
}) {
  const t = useTranslations("UniversalAgent");
  const status = statusOverride ?? getSubAgentCardStatus(toolUIPart);
  const title = extractSubAgentTitle(toolUIPart, t("taskTitleResearchTask"));
  const summary = extractSubAgentSummary(toolUIPart, {
    taskExecutionFailedHint: t("taskExecutionFailedHint"),
    taskStartedWaitingUpdate: t("taskStartedWaitingUpdate"),
    taskCreatedWaitingFirstUpdate: t("taskCreatedWaitingFirstUpdate"),
  });
  const subAgentChatToken = toolUIPart.output?.subAgentChatToken ?? null;
  const [reportCoverUrl, setReportCoverUrl] = useState<string | null>(null);
  const [reportToken, setReportToken] = useState<string | null>(null);

  useEffect(() => {
    if (!subAgentChatToken) {
      setReportCoverUrl(null);
      setReportToken(null);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let retryIndex = 0;

    const loadLatestReport = async () => {
      const result = await fetchUniversalUserChatByToken(subAgentChatToken);
      if (!result.success || cancelled) return false;
      const context = result.data.context as UserChatContext | null;
      const reportTokens = context?.reportTokens ?? [];
      const candidateReportToken = reportTokens.at(-1) ?? null;
      if (!candidateReportToken) {
        setReportToken(null);
        setReportCoverUrl(null);
        return false;
      }

      const report = await fetchAnalystReportByToken(candidateReportToken);
      if (!report.success || cancelled) return false;
      if (!report.data.generatedAt) {
        setReportToken(null);
        setReportCoverUrl(null);
        return false;
      }
      setReportToken(candidateReportToken);
      setReportCoverUrl(report.data.coverCdnHttpUrl ?? null);
      return true;
    };

    const poll = async () => {
      try {
        const foundReport = await loadLatestReport();
        if (cancelled || foundReport) return;

        const nextDelay = UNIVERSAL_REPORT_RETRY_DELAYS_MS[retryIndex];
        if (nextDelay !== undefined) {
          retryIndex += 1;
          timeoutId = setTimeout(poll, nextDelay);
        }
      } catch {
        if (cancelled) return;
        const nextDelay = UNIVERSAL_REPORT_RETRY_DELAYS_MS[retryIndex];
        if (nextDelay !== undefined) {
          retryIndex += 1;
          timeoutId = setTimeout(poll, nextDelay);
          return;
        }
        setReportCoverUrl(null);
        setReportToken(null);
      }
    };

    if (status === "done") {
      poll();
    } else {
      setReportCoverUrl(null);
      setReportToken(null);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, subAgentChatToken]);

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full rounded-md border p-3 text-left space-y-2 bg-muted/20 hover:bg-muted/35 transition-colors"
    >
      <div className="flex items-center gap-2">
        {status === "running" ? (
          <CircleDot className="size-3.5 text-amber-500 animate-pulse" />
        ) : status === "done" ? (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        ) : (
          <CircleX className="size-3.5 text-red-500" />
        )}
        <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">
          {title}
        </div>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground">
          {getSubAgentStatusLabel(status, {
            running: t("statusInProgress"),
            done: t("statusCompleted"),
            error: t("statusNeedsAttention"),
          })}
        </span>
      </div>
      <div className={cn("text-sm text-muted-foreground", summary ? "line-clamp-3" : "")}>
        {summary}
      </div>
      {reportToken ? (
        <div className="relative w-full max-w-[280px] aspect-video overflow-hidden rounded border border-input/40 bg-muted/20">
          {reportCoverUrl ? (
            <Image
              src={reportCoverUrl}
              alt={t("reportCoverPreviewAlt")}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      ) : null}
      <div className="text-xs text-primary">{t("taskProgressOpen")}</div>
    </button>
  );
}

export function renderUniversalSubAgentCardsInMessage({
  message,
  onOpenTaskDetail,
  statusByToolCallId,
}: {
  message: Pick<TUniversalMessageWithTool, "role" | "parts">;
  onOpenTaskDetail: (payload: { toolCallId: string; toolName: string }) => void;
  statusByToolCallId?: Record<string, "running" | "done" | "error">;
}) {
  if (message.role !== "assistant") return null;

  const subAgentParts = message.parts.filter(
    (part): part is SubAgentToolUIPart =>
      part.type === `tool-${UniversalToolName.createSubAgent}`,
  );

  if (subAgentParts.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {subAgentParts.map((part) => (
        <UniversalSubAgentTaskCard
          key={part.toolCallId}
          toolUIPart={part}
          statusOverride={statusByToolCallId?.[part.toolCallId]}
          onOpenDetail={() =>
            onOpenTaskDetail({
              toolCallId: part.toolCallId,
              toolName: UniversalToolName.createSubAgent,
            })
          }
        />
      ))}
    </div>
  );
}

/**
 * Universal Agent Tool UI Display
 * Renders tool call results in the chat UI.
 * Components are defined in their respective modules (Panel, etc.),
 * this file only dispatches to them.
 */
export function UniversalToolUIPartDisplay({
  toolUIPart,
  addToolResult,
  onOpenReport,
  onOpenTaskDetail,
  interactiveOnly = false,
}: {
  toolUIPart: TUniversalMessageWithTool["parts"][number];
  addToolResult?: TAddUniversalUIToolResult;
  onOpenReport?: (payload: { toolCallId: string; reportToken: string }) => void;
  onOpenTaskDetail?: (payload: { toolCallId: string; toolName: string }) => void;
  interactiveOnly?: boolean;
}) {
  const t = useTranslations("UniversalAgent");
  if (!("toolCallId" in toolUIPart)) {
    return null;
  }

  // Phase 1: Interactive tools — render before output is available
  switch (toolUIPart.type) {
    case `tool-${UniversalToolName.requestSelectPersonas}`:
      return (
        <RequestSelectPersonasMessage toolInvocation={toolUIPart} addToolResult={addToolResult} />
      );
    case `tool-${UniversalToolName.confirmPanelResearchPlan}`:
      return (
        <ConfirmPanelResearchPlanMessage
          toolInvocation={toolUIPart}
          addToolResult={addToolResult}
        />
      );
  }

  // Phase 2: Display-only tools — render only when output is available
  if (interactiveOnly) {
    return null;
  }

  if (toolUIPart.state !== "output-available") {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-${UniversalToolName.searchPersonas}`:
      return <SearchPersonasResultMessage toolInvocation={toolUIPart} />;
    case `tool-${UniversalToolName.generateReport}`:
      return (
        <GenerateReportResultMessage toolInvocation={toolUIPart} onClickReport={onOpenReport} />
      );
    case `tool-${UniversalToolName.generatePodcast}`:
      return (
        <UniversalMajorTaskResultCard
          title={t("taskTitleGeneratePodcast")}
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={
            onOpenTaskDetail
              ? () =>
                  onOpenTaskDetail({
                    toolCallId: toolUIPart.toolCallId,
                    toolName: UniversalToolName.generatePodcast,
                  })
              : undefined
          }
        />
      );
    case `tool-${UniversalToolName.interviewChat}`:
      return (
        <UniversalMajorTaskResultCard
          title={t("taskTitlePersonaInterview")}
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={
            onOpenTaskDetail
              ? () =>
                  onOpenTaskDetail({
                    toolCallId: toolUIPart.toolCallId,
                    toolName: UniversalToolName.interviewChat,
                  })
              : undefined
          }
        />
      );
    case `tool-${UniversalToolName.discussionChat}`:
      return (
        <UniversalMajorTaskResultCard
          title={t("taskTitleFocusGroupDiscussion")}
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={
            onOpenTaskDetail
              ? () =>
                  onOpenTaskDetail({
                    toolCallId: toolUIPart.toolCallId,
                    toolName: UniversalToolName.discussionChat,
                  })
              : undefined
          }
        />
      );
    case `tool-${UniversalToolName.deepResearch}`:
      return (
        <UniversalMajorTaskResultCard
          title={t("taskTitleDeepResearch")}
          summary={extractPlainText(toolUIPart)}
          onOpenDetail={
            onOpenTaskDetail
              ? () =>
                  onOpenTaskDetail({
                    toolCallId: toolUIPart.toolCallId,
                    toolName: UniversalToolName.deepResearch,
                  })
              : undefined
          }
        />
      );
    case `tool-${UniversalToolName.updatePanel}`:
      return <UpdatePanelResultMessage toolInvocation={toolUIPart} />;
  }

  return null;
}
