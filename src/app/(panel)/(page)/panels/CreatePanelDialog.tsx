"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { RequestSelectPersonasToolInput } from "@/app/(panel)/tools/requestSelectPersonas/types";
import { UpdatePanelToolOutput } from "@/app/(panel)/tools/updatePanel/types";
import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  HandIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createPanelViaAgent } from "./actions";

// ---------------------------------------------------------------------------
// Status derivation from streamed messages
// ---------------------------------------------------------------------------

type CreationStatus =
  | { phase: "searching" }
  | { phase: "selectingPersonas"; toolCallId: string; candidatePersonaIds: number[] }
  | { phase: "saving" }
  | { phase: "completed"; panelId?: number; panelTitle?: string; personaCount?: number }
  | { phase: "error"; message?: string };

function deriveCreationStatus(messages: TUniversalMessageWithTool[]): CreationStatus {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const parts = msg.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      if (!isToolUIPart(part)) continue;

      // Use part.type for discrimination since getToolName return can't narrow the union
      if (
        part.type === (`tool-${UniversalToolName.updatePanel}` as const) &&
        part.state === "output-available"
      ) {
        // part is now narrowed to updatePanel tool with output-available state
        const output = part.output as UpdatePanelToolOutput;
        return {
          phase: "completed",
          panelId: output.panelId,
          panelTitle: output.title,
          personaCount: output.personaIds.length,
        };
      }

      if (part.type === (`tool-${UniversalToolName.requestSelectPersonas}` as const)) {
        if (part.state === "output-available") {
          return { phase: "saving" };
        }
        if (part.state === "input-available") {
          const input = part.input as RequestSelectPersonasToolInput;
          const inputIds = (input.personaIds ?? []).filter(
            (id): id is number => typeof id === "number",
          );
          return {
            phase: "selectingPersonas",
            toolCallId: part.toolCallId,
            candidatePersonaIds: inputIds,
          };
        }
        // input-streaming or other states — still searching
        return { phase: "searching" };
      }

      if (part.type === (`tool-${UniversalToolName.searchPersonas}` as const)) {
        return { phase: "searching" };
      }
    }
  }
  return { phase: "searching" };
}

/**
 * Extract the latest agent activity from streamed messages.
 * Shows either the latest text snippet or the currently executing tool name.
 */
function getLatestAgentActivity(messages: TUniversalMessageWithTool[], maxLen = 80): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const parts = msg.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j];
      // Tool currently executing (input-streaming or input-available but no output yet)
      if (isToolUIPart(part) && part.state !== "output-available") {
        const toolName = part.type.replace(/^tool-/, "");
        return `exec ${toolName}`;
      }
      if (part.type === "text" && part.text.trim()) {
        const text = part.text.trim();
        if (text.length <= maxLen) return text;
        return "…" + text.slice(-maxLen);
      }
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreatePanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPanelCreated: () => void;
}

export function CreatePanelDialog({ open, onOpenChange, onPanelCreated }: CreatePanelDialogProps) {
  const t = useTranslations("PersonaPanel");
  const router = useRouter();

  // Wizard states
  const [wizardStep, setWizardStep] = useState<"define" | "running">("define");
  const [description, setDescription] = useState("");
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  // useChat — connect to /api/chat/universal with executionMode:"sync".
  //
  // Why sync: The agent lifecycle is tied to the HTTP connection. When the user
  // closes the dialog or refreshes the page, req.signal aborts → agent stops →
  // runId is cleared in DB (via onError → failUserChatRun).
  //
  // This means when the user re-opens the dialog or navigates back, they can
  // safely trigger a new execution (regenerate/continue) without worrying about
  // a stale agent running in the background. No polling needed — the frontend
  // always has the real-time stream, and closed connections cleanly stop the agent.
  //
  // This pattern works because every step before the final result is short
  // (search → select → save). Once updatePanel completes, the dialog redirects.
  const transport = useMemo(
    () =>
      chatToken
        ? new DefaultChatTransport({
            api: "/api/chat/universal",
            prepareSendMessagesRequest({ id, messages: msgs }) {
              const message = prepareLastUIMessageForRequest(msgs);
              const body: ClientMessagePayload = {
                id,
                message,
                userChatToken: chatToken,
                executionMode: "sync",
              };
              return { body };
            },
          })
        : undefined,
    [chatToken],
  );

  const {
    addToolOutput: _addToolOutput,
    messages,
    // status,
    error,
    ...useChatHelpers
  } = useChat<TUniversalMessageWithTool>({
    id: chatToken ?? undefined,
    transport,
  });

  const useChatRef = useRef(useChatHelpers);
  useEffect(() => {
    useChatRef.current = useChatHelpers;
  });

  // addToolResult: update tool output + continue conversation
  const addToolResult: TAddUniversalUIToolResult = useCallback(
    async (...args) => {
      await _addToolOutput(...args);
      useChatRef.current.sendMessage();
    },
    [_addToolOutput],
  );

  // Derive status and streaming text from messages
  const creationStatus = useMemo(() => deriveCreationStatus(messages), [messages]);
  const agentText = useMemo(() => getLatestAgentActivity(messages), [messages]);

  // Track if agent error occurred (streaming error or status error)
  const hasError = error != null || creationStatus.phase === "error";

  // Launch agent
  const handleLaunchAgent = useCallback(
    async (mode: "auto" | "manual") => {
      if (!description.trim()) return;
      setCreating(true);

      const result = await createPanelViaAgent(description.trim(), { mode });
      if (!result.success) {
        toast.error(result.message ?? t("ListPage.loadingFailed"));
        setCreating(false);
        return;
      }

      const token = result.data.token;
      setChatToken(token);
      setWizardStep("running");

      // Fetch the initial messages (contains the user instruction written by createPanelViaAgent),
      // load them into useChat, then regenerate() to trigger agent execution with streaming.
      const chatResult = await fetchUniversalUserChatByToken(token);
      if (chatResult.success) {
        // setMessages loads the user instruction into useChat's state.
        // regenerate() then POSTs to /api/chat/universal which executes the agent.
        // Because the last message is a user message, regenerate triggers a new assistant response.
        useChatRef.current.setMessages(chatResult.data.messages as TUniversalMessageWithTool[]);
        useChatRef.current.regenerate();
      }
      setCreating(false);
    },
    [description, t],
  );

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setWizardStep("define");
    setChatToken(null);
    setDescription("");
    setAutoCloseCountdown(null);
  }, []);

  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (creating) return;
      if (!open) {
        onOpenChange(false);
        resetWizard();
      }
    },
    [creating, resetWizard, onOpenChange],
  );

  // Auto-redirect countdown after completion
  const completedPanelId =
    creationStatus.phase === "completed" ? creationStatus.panelId : undefined;

  useEffect(() => {
    if (!completedPanelId) return;
    onPanelCreated();
    setAutoCloseCountdown(3);
    const interval = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [completedPanelId, onPanelCreated]);

  useEffect(() => {
    if (autoCloseCountdown !== 0 || !completedPanelId) return;
    onOpenChange(false);
    resetWizard();
    router.push(`/panel/${completedPanelId}`);
  }, [autoCloseCountdown, completedPanelId, resetWizard, router, onOpenChange]);

  // ─── Progress Helpers ──────────────────────────────────────────────
  const getProgressPercent = (phase: string): number => {
    if (phase === "searching") return 25;
    if (phase === "selectingPersonas") return 50;
    if (phase === "saving") return 75;
    if (phase === "completed") return 100;
    return 0;
  };

  const renderProgressBar = (phase: string) => {
    const percent = getProgressPercent(phase);
    const stepLabels: Record<string, string> = {
      searching: t("CreatePanelWizard.stepSearching"),
      selectingPersonas: t("CreatePanelWizard.stepSelecting"),
      saving: t("CreatePanelWizard.stepSaving"),
      completed: t("CreatePanelWizard.stepCompleted"),
    };
    const stepLabel = stepLabels[phase] ?? "";

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">
          <span>{stepLabel}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/12 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────
  const renderContent = () => {
    // Step 1: Define Panel
    if (wizardStep === "define") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("ListPage.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ListPage.createPlaceholder")}
              className="min-h-[100px] text-sm resize-none"
              autoFocus
            />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {t("ListPage.selectMode")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLaunchAgent("auto")}
                  disabled={creating || !description.trim()}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
                    "hover:border-foreground/20 hover:bg-accent transition-all",
                    "text-left group",
                    (creating || !description.trim()) && "opacity-50 pointer-events-none",
                  )}
                >
                  <SparklesIcon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-xs font-medium">{t("ListPage.autoSearch")}</span>
                  <span className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                    {t("ListPage.autoSearchDesc")}
                  </span>
                </button>
                <button
                  onClick={() => handleLaunchAgent("manual")}
                  disabled={creating || !description.trim()}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
                    "hover:border-foreground/20 transition-all",
                    "text-left group",
                    (creating || !description.trim()) && "opacity-50 pointer-events-none",
                  )}
                >
                  <HandIcon className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{t("ListPage.manualSelect")}</span>
                  <span className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                    {t("ListPage.manualSelectDesc")}
                  </span>
                </button>
              </div>

              <Link
                href="/persona"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <UploadIcon className="size-3.5" />
                {t("ListPage.importFromPDF")}
                <ExternalLinkIcon className="size-3 ml-auto" />
              </Link>
            </div>

            {creating && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("ListPage.creating")}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    // Step 2+: Agent running — derive UI from messages
    const { phase } = creationStatus;

    // Check for errors
    if (hasError) {
      const errorMessage =
        error?.message ?? (phase === "error" ? creationStatus.message : undefined);
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.error")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
              <AlertCircleIcon className="size-6 text-destructive" />
            </div>
            {errorMessage && (
              <p className="text-xs text-muted-foreground text-center max-w-sm">{errorMessage}</p>
            )}
            <Button variant="outline" size="sm" onClick={resetWizard}>
              {t("CreatePanelWizard.retry")}
            </Button>
          </div>
        </>
      );
    }

    if (phase === "searching") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(phase)}
            <div className="flex flex-col items-center justify-center py-6 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.searching")}</p>
              {agentText && (
                <p className="text-xs text-muted-foreground/60 text-center max-w-sm leading-relaxed line-clamp-2">
                  {agentText}
                </p>
              )}
            </div>
          </div>
        </>
      );
    }

    if (phase === "selectingPersonas") {
      // Build the typed tool invocation for RequestSelectPersonasMessage
      const toolInvocation: Extract<
        TUniversalMessageWithTool["parts"][number],
        { type: `tool-${typeof UniversalToolName.requestSelectPersonas}` }
      > = {
        type: `tool-${UniversalToolName.requestSelectPersonas}`,
        toolCallId: creationStatus.toolCallId,
        state: "input-available" as const,
        input: { personaIds: creationStatus.candidatePersonaIds },
      };

      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.selectPersonas")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(phase)}
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <RequestSelectPersonasMessage
                toolInvocation={toolInvocation}
                addToolResult={addToolResult}
              />
            </div>
          </div>
        </>
      );
    }

    if (phase === "saving") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(phase)}
            <div className="flex flex-col items-center justify-center py-6 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.saving")}</p>
              {agentText && (
                <p className="text-xs text-muted-foreground/60 text-center max-w-sm leading-relaxed line-clamp-2">
                  {agentText}
                </p>
              )}
            </div>
          </div>
        </>
      );
    }

    if (phase === "completed") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.completed")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(phase)}
            <div className="flex flex-col items-center justify-center py-4 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full bg-primary blur-[50px] opacity-10" />
                <div className="relative flex items-center justify-center size-12 rounded-full bg-primary/10">
                  <CheckCircle2Icon className="size-6 text-primary" />
                </div>
              </div>
              {creationStatus.panelTitle && (
                <p className="text-sm font-medium">{creationStatus.panelTitle}</p>
              )}
              {typeof creationStatus.personaCount === "number" && (
                <p className="text-xs text-muted-foreground">
                  {t("CreatePanelWizard.personaCount", { count: creationStatus.personaCount })}
                </p>
              )}
              <div className="flex flex-col items-center gap-2 mt-2">
                {creationStatus.panelId && (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/panel/${creationStatus.panelId}`}>
                      {t("CreatePanelWizard.viewPanel")}
                    </Link>
                  </Button>
                )}
                {autoCloseCountdown !== null && autoCloseCountdown > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("CreatePanelWizard.redirecting", { seconds: autoCloseCountdown })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">{renderContent()}</DialogContent>
    </Dialog>
  );
}
