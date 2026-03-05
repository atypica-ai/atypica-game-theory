"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import type { ConfirmPanelResearchPlanOutput } from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UserChatExtra } from "@/prisma/client";
import { getToolName, isToolUIPart } from "ai";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
  fetchProjectMessages,
  submitResearchConfirmation,
  type PendingConfirmPlan,
} from "./actions";
import { DiscussionView } from "./DiscussionView";
import { InterviewsView } from "./InterviewsView";

export interface ProjectDetailClientProps {
  panelId: number;
  panelTitle: string;
  project: {
    token: string;
    title: string;
    kind: string;
    extra: UserChatExtra;
    createdAt: Date;
  };
}

type ActiveView =
  | { type: "discussion"; timelineToken: string }
  | { type: "interviews"; personaIds: number[] };

export function ProjectDetailClient({ panelId, panelTitle, project }: ProjectDetailClientProps) {
  const t = useTranslations("PersonaPanel.ProjectDetailPage");
  const isRunning = !!project.extra?.runId;

  // Poll project messages — frontend extracts tool calls
  const { data: messages } = useSWR(
    ["projectMessages", project.token],
    async () => {
      const result = await fetchProjectMessages(project.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: isRunning ? 5000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Extract tool calls from messages
  const { timelineTokens, interviewPersonaIds, pendingConfirmPlan } = useMemo(() => {
    if (!messages)
      return {
        timelineTokens: [] as string[],
        interviewPersonaIds: [] as number[],
        pendingConfirmPlan: null as PendingConfirmPlan | null,
      };

    const tokens: string[] = [];
    const pIds: number[] = [];
    let pending: PendingConfirmPlan | null = null;
    let confirmHasOutput = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        const name = getToolName(part);

        if (name === "discussionChat") {
          const output =
            part.state === "output-available"
              ? (part.output as Record<string, unknown> | null)
              : null;
          const input = (part.input as Record<string, unknown>) ?? {};
          const token =
            (typeof output?.timelineToken === "string" ? output.timelineToken : null) ??
            (typeof input.timelineToken === "string" ? input.timelineToken : null);
          if (token && !tokens.includes(token)) tokens.push(token);
        }

        if (name === "interviewChat") {
          const input = part.input as Record<string, unknown> | null;
          const rawPersonas = Array.isArray(input?.personas) ? input.personas : [];
          for (const item of rawPersonas) {
            if (item && typeof item === "object" && "id" in item && typeof item.id === "number") {
              if (!pIds.includes(item.id)) pIds.push(item.id);
            }
          }
        }

        if (name === "confirmPanelResearchPlan") {
          if (part.state === "input-available") {
            pending = {
              toolCallId: part.toolCallId,
              input: part.input as PendingConfirmPlan["input"],
            };
          }
          if (part.state === "output-available") confirmHasOutput = true;
        }
      }
    }

    return {
      timelineTokens: tokens,
      interviewPersonaIds: pIds,
      pendingConfirmPlan: confirmHasOutput ? null : pending,
    };
  }, [messages]);

  const hasDiscussions = timelineTokens.length > 0;
  const hasInterviews = interviewPersonaIds.length > 0;
  const hasContent = hasDiscussions || hasInterviews;

  // Build flat selector items
  const selectorItems = useMemo(() => {
    const items: { label: string }[] = [];
    for (let i = 0; i < timelineTokens.length; i++) {
      items.push({ label: t("discussionNumber", { number: i + 1 }) });
    }
    if (interviewPersonaIds.length > 0) {
      items.push({ label: t("interviewNumber", { number: 1 }) });
    }
    return items;
  }, [timelineTokens.length, interviewPersonaIds.length, t]);

  // Active view state
  const [activeView, setActiveView] = useState<ActiveView | null>(null);

  // Derive current view — auto-select first available if none selected
  const currentView = useMemo<ActiveView | null>(() => {
    if (activeView) return activeView;
    if (hasDiscussions) return { type: "discussion", timelineToken: timelineTokens[0] };
    if (hasInterviews) return { type: "interviews", personaIds: interviewPersonaIds };
    return null;
  }, [activeView, hasDiscussions, hasInterviews, timelineTokens, interviewPersonaIds]);

  const selectorSelectedIndex = useMemo(() => {
    if (!currentView) return 0;
    if (currentView.type === "discussion") {
      return timelineTokens.indexOf(currentView.timelineToken);
    }
    return timelineTokens.length; // interview is after all discussions
  }, [currentView, timelineTokens]);

  const handleSelectorSelect = useCallback(
    (index: number) => {
      if (index < timelineTokens.length) {
        setActiveView({ type: "discussion", timelineToken: timelineTokens[index] });
      } else {
        setActiveView({ type: "interviews", personaIds: interviewPersonaIds });
      }
    },
    [timelineTokens, interviewPersonaIds],
  );

  const handleConfirmPlan = useCallback(
    async (output: ConfirmPanelResearchPlanOutput) => {
      if (!pendingConfirmPlan) return;
      await submitResearchConfirmation(project.token, pendingConfirmPlan.toolCallId, output);
    },
    [pendingConfirmPlan, project.token],
  );

  const selector =
    selectorItems.length > 1
      ? {
          items: selectorItems,
          selectedIndex: selectorSelectedIndex,
          onSelect: handleSelectorSelect,
        }
      : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!hasContent ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span
                className={cn(
                  "size-2 rounded-full transition-colors",
                  isRunning ? "bg-ghost-green" : "bg-zinc-400",
                )}
              />
              {isRunning && (
                <span className="absolute size-2 rounded-full bg-ghost-green animate-ping opacity-75" />
              )}
            </div>
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                isRunning ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {isRunning ? t("agentRunning") : t("idle")}
            </p>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href={`/universal/${project.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              {t("viewAgentChat")}
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      ) : currentView?.type === "discussion" ? (
        <DiscussionView
          timelineToken={currentView.timelineToken}
          panel={{ id: panelId, title: panelTitle }}
          project={project}
          selector={selector}
        />
      ) : currentView?.type === "interviews" ? (
        <InterviewsView
          panel={{ id: panelId, title: panelTitle }}
          project={project}
          personaIds={currentView.personaIds}
          selector={selector}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin mr-2" />
          {t("agentRunning")}
        </div>
      )}

      {/* Confirm Plan Dialog */}
      <Dialog open={!!pendingConfirmPlan} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirm Research Plan</DialogTitle>
          </DialogHeader>
          {pendingConfirmPlan && (
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <ConfirmPanelResearchPlanMessage
                toolInvocation={{
                  type: `tool-${UniversalToolName.confirmPanelResearchPlan}`,
                  toolCallId: pendingConfirmPlan.toolCallId,
                  state: "input-available",
                  input: pendingConfirmPlan.input,
                }}
                addToolResult={async ({ output }) => {
                  await handleConfirmPlan(output as ConfirmPanelResearchPlanOutput);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
