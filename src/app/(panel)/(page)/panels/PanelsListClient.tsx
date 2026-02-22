"use client";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { TAddUniversalUIToolResult, UniversalToolName } from "@/app/(universal)/tools/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createPanelViaAgent,
  deletePersonaPanel,
  fetchPanelCreationProgress,
  fetchUserPersonaPanels,
  PanelCreationProgress,
  PersonaPanelWithDetails,
  submitPanelCreationToolResult,
} from "./actions";

type WizardPhase = "input" | "running";

export function PersonaPanelsListClient() {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const router = useRouter();
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [description, setDescription] = useState("");
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<PersonaPanelWithDetails | null>(null);

  // Wizard state
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>("input");
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<PanelCreationProgress | null>(null);
  const pollingRef = useRef(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    const result = await fetchUserPersonaPanels();
    if (result.success) {
      setPanels(result.data);
    } else {
      toast.error(t("ListPage.loadingFailed"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const handleDeletePanel = useCallback(
    (panel: PersonaPanelWithDetails) => {
      if (panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) {
        toast.error(t("ListPage.cannotDeleteUsedPanel"));
        return;
      }
      setPanelToDelete(panel);
    },
    [t],
  );

  const confirmDelete = useCallback(async () => {
    if (!panelToDelete) return;

    setDeletingPanelId(panelToDelete.id);
    const result = await deletePersonaPanel(panelToDelete.id);
    setDeletingPanelId(null);
    setPanelToDelete(null);

    if (result.success) {
      toast.success(t("ListPage.deleteSuccess"));
      await loadPanels();
    } else {
      toast.error(t("ListPage.deleteFailed"));
    }
  }, [panelToDelete, t, loadPanels]);

  // Submit description → create agent chat
  const handleCreatePanel = useCallback(async () => {
    if (!description.trim()) return;
    setCreating(true);
    const result = await createPanelViaAgent(description.trim());
    if (result.success) {
      setChatToken(result.data.token);
      setWizardPhase("running");
      setCreating(false);
    } else {
      toast.error(result.message ?? t("ListPage.loadingFailed"));
      setCreating(false);
    }
  }, [description, t]);

  // Poll progress when wizard is running
  useEffect(() => {
    if (wizardPhase !== "running" || !chatToken) return;
    if (progress?.status === "selectingPersonas") return; // pause polling while user selects
    pollingRef.current = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!pollingRef.current) return;
      const result = await fetchPanelCreationProgress(chatToken);
      if (!pollingRef.current) return;

      if (result.success) {
        setProgress(result.data);
        if (result.data.status === "completed") {
          await loadPanels();
          return; // stop polling
        }
        if (result.data.status === "error") return; // stop polling
      }
      timeoutId = setTimeout(poll, 3000);
    };

    poll();
    return () => {
      pollingRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [wizardPhase, chatToken, loadPanels, progress?.status]);

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
      // Optimistic transition — show saving immediately instead of waiting for next poll
      setProgress((prev) => (prev ? { ...prev, status: "saving" } : { status: "saving" }));
    },
    [chatToken],
  );

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setWizardPhase("input");
    setChatToken(null);
    setProgress(null);
    setDescription("");
    setAutoCloseCountdown(null);
    pollingRef.current = false;
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (creating) return;
      if (!open) {
        setShowCreateDialog(false);
        resetWizard();
      }
    },
    [creating, resetWizard],
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

  // Navigate when countdown reaches 0
  useEffect(() => {
    if (autoCloseCountdown !== 0 || !progress?.panelId) return;
    setShowCreateDialog(false);
    resetWizard();
    router.push(`/panel/${progress.panelId}`);
  }, [autoCloseCountdown, progress?.panelId, resetWizard, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Step indicator for running phase
  const STEPS = ["search", "select", "save", "done"] as const;
  const getActiveStep = (status: string): number => {
    if (status === "searching") return 0;
    if (status === "selectingPersonas") return 1;
    if (status === "saving") return 2;
    if (status === "completed") return 3;
    return 0;
  };

  const renderStepIndicator = (status: string) => {
    const active = getActiveStep(status);
    return (
      <div className="flex gap-2 mb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-px rounded-full transition-colors duration-300",
              i < active
                ? "bg-foreground/15"
                : i === active
                  ? "bg-foreground/8"
                  : "bg-foreground/3",
            )}
          />
        ))}
      </div>
    );
  };

  // Render wizard dialog content based on phase and progress
  const renderWizardContent = () => {
    if (wizardPhase === "input") {
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
          <div className="space-y-4 mt-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ListPage.createPlaceholder")}
              className="min-h-[120px] text-sm resize-none"
              autoFocus
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCreatePanel}
                disabled={!description.trim() || creating}
                size="sm"
                className="gap-1.5"
              >
                {creating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {creating ? t("ListPage.creating") : t("ListPage.create")}
              </Button>
            </div>
          </div>
        </>
      );
    }

    // Running phase — render based on progress status
    const status = progress?.status ?? "searching";

    if (status === "searching") {
      return (
        <>
          {renderStepIndicator(status)}
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="w-full max-w-xs space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full bg-muted animate-pulse"
                  style={{
                    animationDelay: `${i * 150}ms`,
                    width: `${85 - i * 15}%`,
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.searching")}</p>
          </div>
        </>
      );
    }

    if (status === "selectingPersonas" && progress?.toolCallId) {
      return (
        <>
          {renderStepIndicator(status)}
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.selectPersonas")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <RequestSelectPersonasMessage
              toolInvocation={{
                type: `tool-${UniversalToolName.requestSelectPersonas}`,
                toolCallId: progress.toolCallId,
                state: "input-available",
                input: {
                  personaIds: progress.candidatePersonaIds ?? [],
                },
              }}
              addToolResult={handleToolResult}
            />
          </div>
        </>
      );
    }

    if (status === "saving") {
      return (
        <>
          {renderStepIndicator(status)}
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("ListPage.createNewPanel")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <Loader2 className="size-5 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">{t("CreatePanelWizard.saving")}</p>
          </div>
        </>
      );
    }

    if (status === "completed") {
      return (
        <>
          {renderStepIndicator(status)}
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("CreatePanelWizard.completed")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full bg-green-500 blur-[50px] opacity-20" />
              <div className="relative flex items-center justify-center size-12 rounded-full bg-green-500/10">
                <CheckCircle2 className="size-6 text-green-500" />
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
                    <ArrowRight className="size-3.5" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetWizard();
              }}
            >
              {t("CreatePanelWizard.retry")}
            </Button>
          </div>
        </>
      );
    }

    // Fallback — should not happen
    return null;
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* Panels Grid */}
          {panels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New Panel Card */}
              <button
                onClick={() => setShowCreateDialog(true)}
                className="group border border-dashed border-border rounded-lg p-5 hover:border-green-500/30 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[150px]"
              >
                <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-green-500/50 group-hover:bg-green-500/5 transition-all">
                  <Plus className="size-5 text-muted-foreground" />
                </div>
                <div className="text-sm text-center space-y-1">
                  <div className="font-medium">{t("ListPage.createNewPanel")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("ListPage.createNewPanelDescription")}
                  </div>
                </div>
              </button>

              {/* Existing Panels */}
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300"
                >
                  <Link href={`/panel/${panel.id}`} className="block p-4">
                    <div className="flex flex-col gap-3">
                      {/* Title + date */}
                      <div className="space-y-1 pr-6">
                        <div className="text-sm font-medium leading-snug">
                          {panel.title || t("panelId", { id: panel.id })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(panel.createdAt, locale)}
                        </div>
                      </div>

                      {/* Instruction */}
                      {panel.instruction && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
                          {panel.instruction}
                        </p>
                      )}

                      {/* Personas preview */}
                      {panel.personas.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-border/50">
                          {panel.personas.slice(0, 3).map((persona) => (
                            <div key={persona.id} className="flex items-baseline gap-2 min-w-0">
                              <span className="text-xs font-medium shrink-0">
                                {persona.name}
                              </span>
                              {Array.isArray(persona.tags) && persona.tags.length > 0 && (
                                <span className="text-[11px] text-muted-foreground/60 truncate">
                                  {(persona.tags as string[]).slice(0, 2).map((t) => `#${t}`).join(" ")}
                                </span>
                              )}
                            </div>
                          ))}
                          {panel.personas.length > 3 && (
                            <span className="text-xs text-muted-foreground/50">
                              {t("ListPage.andMore", { count: panel.personas.length - 3 })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: usage stats + arrow */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <span>
                            {t("personaCount", { count: panel.personas.length })}
                          </span>
                          {(panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) && (
                            <>
                              <span>·</span>
                              <span>
                                {[
                                  panel.usageCount.discussions > 0 &&
                                    t("discussions", { count: panel.usageCount.discussions }),
                                  panel.usageCount.interviews > 0 &&
                                    t("interviews", { count: panel.usageCount.interviews }),
                                ]
                                  .filter(Boolean)
                                  .join("、")}
                              </span>
                            </>
                          )}
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeletePanel(panel);
                    }}
                    disabled={deletingPanelId === panel.id}
                    className={cn(
                      "absolute top-3 right-3 size-7 rounded-md flex items-center justify-center",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-muted",
                      panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0
                        ? "cursor-not-allowed opacity-30"
                        : "",
                    )}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border border-dashed border-border flex items-center justify-center">
                <MessageCircle className="size-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm font-medium">{t("ListPage.createNewPanel")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("ListPage.createNewPanelDescription")}
                </div>
              </div>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="mt-2 text-sm hover:underline flex items-center gap-1.5"
              >
                <ArrowRight className="size-3.5" />
                {t("ListPage.startDiscussion")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Panel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">{renderWizardContent()}</DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!panelToDelete} onOpenChange={() => setPanelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ListPage.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {panelToDelete && t("ListPage.deleteWarning", { id: panelToDelete.id })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ListPage.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {deletingPanelId ? t("ListPage.deleting") : t("ListPage.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
