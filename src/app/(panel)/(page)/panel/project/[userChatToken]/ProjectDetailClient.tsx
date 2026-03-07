"use client";
import {
  ClientMessagePayload,
  CONTINUE_ASSISTANT_STEPS,
  prepareLastUIMessageForRequest,
} from "@/ai/messageUtilsClient";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UserChatExtra } from "@/prisma/client";
import { UserChatContext } from "@/app/(study)/context/types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stopUserChatRunAction } from "@/lib/userChat/actions";
import { type PendingConfirmPlan } from "./actions";
import { DiscussionView } from "./DiscussionView";
import { InterviewsView } from "./InterviewsView";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectDetailClientProps {
  panelId: number;
  panelTitle: string;
  project: {
    token: string;
    title: string;
    kind: string;
    extra: UserChatExtra;
    context: UserChatContext;
    createdAt: Date;
  };
  initialMessages: TUniversalMessageWithTool[];
}

type ActiveView =
  | { type: "discussion"; timelineToken: string }
  | { type: "interviews"; personaIds: number[] };

interface ReportInfo {
  reportToken: string;
  state: "completed" | "in-progress";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the latest agent activity from streamed messages.
 * Returns the full text so the display container can handle overflow.
 */
function getLatestAgentActivity(messages: TUniversalMessageWithTool[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const parts = msg.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      if (isToolUIPart(part) && part.state !== "output-available") {
        const toolName = part.type.replace(/^tool-/, "");
        return `exec ${toolName}`;
      }
      if (part.type === "text" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return "";
}

/** Fixed-height container that auto-scrolls to show the latest content. */
function AgentActivityText({ text }: { text: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  if (!text) return null;

  return (
    <div
      ref={scrollRef}
      className="max-h-[3.75rem] overflow-hidden text-xs text-muted-foreground max-w-sm leading-relaxed"
    >
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectDetailClient({
  panelId,
  panelTitle,
  project,
  initialMessages,
}: ProjectDetailClientProps) {
  const t = useTranslations("PersonaPanel.ProjectDetailPage");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/universal",
        prepareSendMessagesRequest({ id, messages: msgs }) {
          const message = prepareLastUIMessageForRequest(msgs);
          const body: ClientMessagePayload = {
            id,
            message,
            userChatToken: project.token,
          };
          return { body };
        },
      }),
    [project.token],
  );

  const {
    addToolOutput: _addToolOutput,
    messages,
    status,
    error,
    ...useChatHelpers
  } = useChat<TUniversalMessageWithTool>({
    messages: initialMessages,
    transport,
  });

  const useChatRef = useRef(useChatHelpers);
  useEffect(() => {
    useChatRef.current = useChatHelpers;
  });

  // ─── addToolResult ───
  const addToolResult: TAddUniversalUIToolResult = useCallback(
    async (...args) => {
      await _addToolOutput(...args);
      useChatRef.current.sendMessage();
    },
    [_addToolOutput],
  );

  // ─── Auto-trigger agent on mount ───
  // Determine whether the plan has already been confirmed by checking
  // initialMessages for a confirmPanelResearchPlan tool call with output.
  const isPlanConfirmed = useMemo(() => {
    for (const msg of initialMessages) {
      for (const part of msg.parts) {
        if (
          isToolUIPart(part) &&
          part.type.replace(/^tool-/, "") === "confirmPanelResearchPlan" &&
          part.state === "output-available"
        ) {
          return true;
        }
      }
    }
    return false;
  }, [initialMessages]);

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;

    const isRunning = !!project.extra?.runId;

    if (isRunning) {
      if (isPlanConfirmed) {
        // Research phase — agent is running discussion/interview in background.
        // Don't interrupt; DiscussionView/InterviewsView use SWR polling.
        return;
      }
      // Plan phase — safe to kill and restart (idempotent).
      stopUserChatRunAction({ userChatToken: project.token }).then(() => {
        useChatRef.current.regenerate();
      });
      return;
    }

    const lastMessage = initialMessages[initialMessages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.role === "user") {
      useChatRef.current.regenerate();
    } else if (lastMessage.role === "assistant") {
      // Check if last assistant message has a pending tool call (no output yet)
      const hasPendingTool = lastMessage.parts.some(
        (part) => isToolUIPart(part) && part.state !== "output-available",
      );
      // Only continue if the assistant message looks incomplete
      if (hasPendingTool) return;
      useChatRef.current.sendMessage({ text: CONTINUE_ASSISTANT_STEPS });
    }
  }, [initialMessages, project.extra?.runId, project.token, isPlanConfirmed]);

  // ─── Extract tool calls from messages ───
  const { timelineTokens, interviewPersonaIds, pendingConfirmPlan, reports } = useMemo(() => {
    if (!messages?.length)
      return {
        timelineTokens: [] as string[],
        interviewPersonaIds: [] as number[],
        pendingConfirmPlan: null as PendingConfirmPlan | null,
        reports: [] as ReportInfo[],
      };

    const tokens: string[] = [];
    const pIds: number[] = [];
    let pending: PendingConfirmPlan | null = null;
    let confirmHasOutput = false;
    const reportList: ReportInfo[] = [];

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        // Use part.type directly to get tool name — getToolName returns a narrowed
        // union type (keyof UniversalUITools) which doesn't include discussion/interview
        // tools that are server-executed and not in the UI tools map.
        const name = part.type.replace(/^tool-/, "");

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

        if (name === "generateReport") {
          const input = part.input as Record<string, unknown> | null;
          const output =
            part.state === "output-available"
              ? (part.output as Record<string, unknown> | null)
              : null;
          const reportToken =
            (typeof output?.reportToken === "string" ? output.reportToken : null) ??
            (typeof input?.reportToken === "string" ? input.reportToken : null);
          if (reportToken) {
            reportList.push({
              reportToken,
              state: part.state === "output-available" ? "completed" : "in-progress",
            });
          }
        }
      }
    }

    return {
      timelineTokens: tokens,
      interviewPersonaIds: pIds,
      pendingConfirmPlan: confirmHasOutput ? null : pending,
      reports: reportList,
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

  const selector =
    selectorItems.length > 1
      ? {
          items: selectorItems,
          selectedIndex: selectorSelectedIndex,
          onSelect: handleSelectorSelect,
        }
      : undefined;

  // Derive agent running state from useChat status
  const isStreaming = status === "streaming" || status === "submitted";
  const isBackgroundRunning = !!project.extra?.runId;
  const isAgentActive = isStreaming || isBackgroundRunning;

  const agentActivity = useMemo(() => getLatestAgentActivity(messages), [messages]);
  const hasError = error != null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!hasContent ? (
        // ─── Agent View ───
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            {hasError ? (
              // Error state
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-full bg-destructive/10">
                  <AlertCircle className="size-5 text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  {error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => useChatRef.current.regenerate()}
                >
                  {t("retry")}
                </Button>
              </div>
            ) : (
              // Running / idle state
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <span
                      className={cn(
                        "size-2 rounded-full transition-colors",
                        isAgentActive ? "bg-ghost-green" : "bg-zinc-400",
                      )}
                    />
                    {isAgentActive && (
                      <span className="absolute size-2 rounded-full bg-ghost-green animate-ping opacity-75" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isAgentActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {isAgentActive ? t("agentRunning") : t("idle")}
                  </p>
                  <span className="text-muted-foreground/40">&middot;</span>
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
                {isAgentActive && agentActivity && (
                  <AgentActivityText text={agentActivity} />
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        // ─── Results View ───
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Agent running indicator (when has content but still running) */}
          {isAgentActive && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border">
              <div className="relative flex items-center justify-center">
                <span className="size-1.5 rounded-full bg-ghost-green" />
                <span className="absolute size-1.5 rounded-full bg-ghost-green animate-ping opacity-75" />
              </div>
              <p className="text-xs text-muted-foreground">{t("agentRunning")}</p>
              {agentActivity && (
                <p className="text-xs text-muted-foreground/50 truncate max-w-xs">
                  {agentActivity}
                </p>
              )}
            </div>
          )}

          {/* Content views */}
          {currentView?.type === "discussion" ? (
            <DiscussionView
              timelineToken={currentView.timelineToken}
              panel={{ id: panelId, title: panelTitle }}
              project={project}
              selector={selector}
              reports={reports}
            />
          ) : currentView?.type === "interviews" ? (
            <InterviewsView
              panel={{ id: panelId, title: panelTitle }}
              project={project}
              personaIds={currentView.personaIds}
              selector={selector}
              reports={reports}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />
              {t("agentRunning")}
            </div>
          )}
        </div>
      )}

      {/* Confirm Plan Dialog */}
      <Dialog open={!!pendingConfirmPlan} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("confirmPlan")}</DialogTitle>
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
                addToolResult={addToolResult}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
