"use client";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { TAddUniversalUIToolResult, UniversalToolName } from "@/app/(universal)/tools/types";
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
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Hand,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
  createPanelViaAgent,
  fetchPanelCreationProgress,
  submitPanelCreationToolResult,
} from "./actions";

type WizardStep = "define" | "choose";
type WizardPhase = "input" | "running";

interface CreatePanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPanelCreated: () => void;
}

export function CreatePanelDialog({ open, onOpenChange, onPanelCreated }: CreatePanelDialogProps) {
  const t = useTranslations("PersonaPanel");
  const router = useRouter();
  const locale = t("title"); // Get locale from translations

  // Wizard states
  const [wizardStep, setWizardStep] = useState<WizardStep>("define");
  const [description, setDescription] = useState("");
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>("input");
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Use SWR for panel creation progress polling
  const { data: progress, mutate: mutateProgress } = useSWR(
    wizardPhase === "running" && chatToken ? ["panel:creationProgress", chatToken] : null,
    async () => {
      const result = await fetchPanelCreationProgress(chatToken!);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: (data) => {
        if (data?.status === "selectingPersonas") return 0;
        if (data?.status === "completed" || data?.status === "error") return 0;
        return 3000;
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: async (data) => {
        if (data.status === "completed") {
          onPanelCreated();
        }
      },
    },
  );

  // Launch agent (auto or manual mode)
  const handleLaunchAgent = useCallback(
    async (mode: "auto" | "manual") => {
      if (!description.trim()) return;
      setCreating(true);
      setWizardStep("choose");
      const result = await createPanelViaAgent(description.trim(), {
        mode,
      });
      if (result.success) {
        setChatToken(result.data.token);
        setWizardPhase("running");
      } else {
        toast.error(result.message ?? t("ListPage.loadingFailed"));
        setWizardStep("define");
      }
      setCreating(false);
    },
    [description, t],
  );

  // Submit tool result from persona selector
  const handleToolResult: TAddUniversalUIToolResult = useCallback(
    async ({ toolCallId, output }) => {
      if (!chatToken) return;
      await submitPanelCreationToolResult(
        chatToken,
        toolCallId,
        UniversalToolName.requestSelectPersonas,
        output as Record<string, unknown>,
      );
      // Immediately re-fetch progress so UI transitions from selectingPersonas → saving
      mutateProgress();
    },
    [chatToken, mutateProgress],
  );

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setWizardStep("define");
    setWizardPhase("input");
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
  useEffect(() => {
    if (progress?.status !== "completed" || !progress.panelId) return;
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
  }, [progress?.status, progress?.panelId]);

  useEffect(() => {
    if (autoCloseCountdown !== 0 || !progress?.panelId) return;
    onOpenChange(false);
    resetWizard();
    router.push(`/panel/${progress.panelId}`);
  }, [autoCloseCountdown, progress?.panelId, resetWizard, router, onOpenChange]);

  // ─── Progress Helpers ──────────────────────────────────────────────
  const getProgressPercent = (status: string): number => {
    if (status === "searching") return 25;
    if (status === "selectingPersonas") return 50;
    if (status === "saving") return 75;
    if (status === "completed") return 100;
    return 0;
  };

  const getStepLabel = (status: string, locale: string): string => {
    if (status === "searching") return locale === "zh-CN" ? "步骤 1/3" : "Step 1 of 3";
    if (status === "selectingPersonas") return locale === "zh-CN" ? "步骤 2/3" : "Step 2 of 3";
    if (status === "saving") return locale === "zh-CN" ? "步骤 3/3" : "Step 3 of 3";
    if (status === "completed") return locale === "zh-CN" ? "完成" : "Completed";
    return "";
  };

  const renderProgressBar = (status: string) => {
    const percent = getProgressPercent(status);
    const stepLabel = getStepLabel(status, locale);

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

  // ─── Wizard Content ────────────────────────────────────────────────
  const renderWizardContent = () => {
    // Step 1: Define Panel
    if (wizardStep === "define" && wizardPhase === "input") {
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
            {/* Description */}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ListPage.createPlaceholder")}
              className="min-h-[100px] text-sm resize-none"
              autoFocus
            />

            {/* Choose mode */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {t("ListPage.selectMode")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLaunchAgent("auto")}
                  disabled={creating}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
                    "hover:border-foreground/20 hover:bg-accent transition-all",
                    "text-left group",
                    creating && "opacity-50 pointer-events-none",
                  )}
                >
                  <Sparkles className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-xs font-medium">{t("ListPage.autoSearch")}</span>
                  <span className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                    {t("ListPage.autoSearchDesc")}
                  </span>
                </button>
                <button
                  onClick={() => handleLaunchAgent("manual")}
                  disabled={creating}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
                    "hover:border-foreground/20 transition-all",
                    "text-left group",
                    creating && "opacity-50 pointer-events-none",
                  )}
                >
                  <Hand className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{t("ListPage.manualSelect")}</span>
                  <span className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                    {t("ListPage.manualSelectDesc")}
                  </span>
                </button>
              </div>

              {/* Import PDF shortcut */}
              <Link
                href="/persona"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Upload className="size-3.5" />
                {t("ListPage.importFromPDF")}
                <ExternalLink className="size-3 ml-auto" />
              </Link>
            </div>

            {/* Loading indicator when creating */}
            {creating && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("ListPage.creating")}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    // Step 2: Agent running
    const status = progress?.status ?? "searching";

    if (status === "searching") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(status)}
            <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="w-full max-w-xs space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full bg-muted animate-pulse"
                    style={{ animationDelay: `${i * 150}ms`, width: `${85 - i * 15}%` }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.searching")}</p>
            </div>
          </div>
        </>
      );
    }

    if (status === "selectingPersonas" && progress?.toolCallId) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.selectPersonas")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(status)}
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <RequestSelectPersonasMessage
                toolInvocation={{
                  type: `tool-${UniversalToolName.requestSelectPersonas}`,
                  toolCallId: progress.toolCallId,
                  state: "input-available",
                  input: { personaIds: progress.candidatePersonaIds ?? [] },
                }}
                addToolResult={handleToolResult}
              />
            </div>
          </div>
        </>
      );
    }

    if (status === "saving") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(status)}
            <div className="flex flex-col items-center justify-center py-6 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.saving")}</p>
            </div>
          </div>
        </>
      );
    }

    if (status === "completed") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.completed")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {renderProgressBar(status)}
            <div className="flex flex-col items-center justify-center py-4 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full bg-primary blur-[50px] opacity-10" />
                <div className="relative flex items-center justify-center size-12 rounded-full bg-primary/10">
                  <CheckCircle2 className="size-6 text-primary" />
                </div>
              </div>
              {progress?.panelTitle && <p className="text-sm font-medium">{progress.panelTitle}</p>}
              {typeof progress?.personaCount === "number" && (
                <p className="text-xs text-muted-foreground">
                  {t("CreatePanelWizard.personaCount", { count: progress.personaCount })}
                </p>
              )}
              <div className="flex flex-col items-center gap-2 mt-2">
                {progress?.panelId && (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/panel/${progress.panelId}`}>
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

    if (status === "error") {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.error")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            {progress?.errorMessage && (
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                {progress.errorMessage}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={resetWizard}>
              {t("CreatePanelWizard.retry")}
            </Button>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">{renderWizardContent()}</DialogContent>
    </Dialog>
  );
}
