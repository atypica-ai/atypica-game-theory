"use client";
import { RequestSelectPersonasMessage } from "@/app/(panel)/tools/requestSelectPersonas/RequestSelectPersonasMessage";
import { TAddUniversalUIToolResult, UniversalToolName } from "@/app/(universal)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Hand,
  Loader2,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
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

type WizardStep = "define" | "choose";
type WizardPhase = "input" | "running";

/** Build compact extra summary based on role */
function buildExtraSummary(extra: PersonaExtra): string {
  if (!extra) return "";
  const parts: string[] = [];
  if (extra.role === "consumer") {
    if (extra.ageRange) parts.push(extra.ageRange);
    if (extra.location) parts.push(extra.location);
    if (extra.title) parts.push(extra.title);
  } else if (extra.role === "buyer") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.organization) parts.push(extra.organization);
  } else if (extra.role === "expert") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.experience) parts.push(extra.experience);
  }
  return parts.join(" · ");
}

export function PersonaPanelsListClient() {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const router = useRouter();
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<PersonaPanelWithDetails | null>(null);

  // Wizard Step 1 - Define
  const [wizardStep, setWizardStep] = useState<WizardStep>("define");
  const [targetSize, setTargetSize] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDescriptionConfirmed, setIsDescriptionConfirmed] = useState(false);

  // Wizard Step 2 - Choose (agent running)
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

  // Step 1: Confirm description → extract tags
  const handleConfirmDescription = useCallback(() => {
    const text = description.trim();
    if (!text) return;

    // Simple keyword extraction from description
    const roughWords = text
      .toLowerCase()
      .split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g)
      .filter((w) => w && w.length >= 2);
    const unique: string[] = [];
    for (const w of roughWords) {
      if (!unique.includes(w)) unique.push(w);
    }
    setTags(unique.slice(0, 8));
    setIsDescriptionConfirmed(true);
  }, [description]);

  // Step 2: Launch agent (auto or manual mode)
  const handleLaunchAgent = useCallback(
    async (mode: "auto" | "manual") => {
      if (!description.trim()) return;
      setCreating(true);
      setWizardStep("choose");
      const result = await createPanelViaAgent(description.trim(), {
        targetSize: targetSize ? parseInt(targetSize, 10) : undefined,
        tags: tags.length > 0 ? tags : undefined,
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
    [description, targetSize, tags, t],
  );

  // Poll progress when wizard is running
  useEffect(() => {
    if (wizardPhase !== "running" || !chatToken) return;
    if (progress?.status === "selectingPersonas") return;
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
          return;
        }
        if (result.data.status === "error") return;
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
      setProgress((prev) => (prev ? { ...prev, status: "saving" } : { status: "saving" }));
    },
    [chatToken],
  );

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setWizardStep("define");
    setWizardPhase("input");
    setChatToken(null);
    setProgress(null);
    setDescription("");
    setTargetSize("");
    setTags([]);
    setIsDescriptionConfirmed(false);
    setAutoCloseCountdown(null);
    pollingRef.current = false;
  }, []);

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

  useEffect(() => {
    if (autoCloseCountdown !== 0 || !progress?.panelId) return;
    setShowCreateDialog(false);
    resetWizard();
    router.push(`/panel/${progress.panelId}`);
  }, [autoCloseCountdown, progress?.panelId, resetWizard, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Step indicator ────────────────────────────────────────────
  const AGENT_STEPS = ["search", "select", "save", "done"] as const;
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
      <div className="flex gap-1.5 mb-4">
        {AGENT_STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-0.5 rounded-full transition-all duration-500",
              i < active ? "bg-foreground/15" : i === active ? "bg-foreground/8" : "bg-muted",
            )}
          />
        ))}
      </div>
    );
  };

  // ─── Wizard content ────────────────────────────────────────────
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
            {/* Target size + description in one sentence */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {locale === "zh-CN" ? "创建一个包含" : "Create a panel of"}
                </span>
                <Select value={targetSize} onValueChange={setTargetSize}>
                  <SelectTrigger className="h-7 w-20 text-sm font-medium">
                    <SelectValue placeholder={locale === "zh-CN" ? "人数" : "Size"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Array.from({ length: 50 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-sm">
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">
                  {locale === "zh-CN" ? "个 Persona 的 Panel" : "personas"}
                </span>
              </div>

              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (isDescriptionConfirmed) {
                    setIsDescriptionConfirmed(false);
                    setTags([]);
                  }
                }}
                placeholder={t("ListPage.createPlaceholder")}
                className="min-h-[100px] text-sm resize-none"
                autoFocus
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {description.length} {locale === "zh-CN" ? "字符" : "chars"}
                </span>
                {!isDescriptionConfirmed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConfirmDescription}
                    disabled={!description.trim()}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Sparkles className="size-3" />
                    {locale === "zh-CN" ? "提取关键词" : "Extract Keywords"}
                  </Button>
                ) : (
                  <span className="text-[11px] text-primary flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {locale === "zh-CN" ? "已提取" : "Extracted"}
                  </span>
                )}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Choose mode — only show after description confirmed */}
            {isDescriptionConfirmed && (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === "zh-CN" ? "选择 Persona 的方式" : "How to find Personas"}
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
                    <span className="text-xs font-medium">
                      {locale === "zh-CN" ? "自动搜索" : "Auto Search"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
                      {locale === "zh-CN"
                        ? "AI 根据描述自动匹配"
                        : "AI matches based on description"}
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
                    <span className="text-xs font-medium">
                      {locale === "zh-CN" ? "手动选择" : "Manual Select"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
                      {locale === "zh-CN"
                        ? "从 Persona 库中搜索选择"
                        : "Browse and pick from library"}
                    </span>
                  </button>
                </div>

                {/* Import PDF shortcut */}
                <Link
                  href="/persona"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Upload className="size-3.5" />
                  {locale === "zh-CN"
                    ? "从访谈 PDF 导入 Persona →"
                    : "Import Personas from interview PDF →"}
                  <ExternalLink className="size-3 ml-auto" />
                </Link>
              </div>
            )}

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
                  style={{ animationDelay: `${i * 150}ms`, width: `${85 - i * 15}%` }}
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
                input: { personaIds: progress.candidatePersonaIds ?? [] },
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
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
            <Button variant="outline" size="sm" onClick={resetWizard}>
              {t("CreatePanelWizard.retry")}
            </Button>
          </div>
        </>
      );
    }

    return null;
  };

  // ─── Main render ───────────────────────────────────────────────
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
                className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px]"
              >
                <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-foreground/20 group-hover:bg-accent transition-all">
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
                        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                          {panel.instruction}
                        </p>
                      )}

                      {/* Personas preview with avatars */}
                      {panel.personas.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {panel.personas.slice(0, 3).map((persona) => {
                            const extraStr = buildExtraSummary(persona.extra);
                            return (
                              <div key={persona.id} className="flex items-center gap-2 min-w-0">
                                <HippyGhostAvatar
                                  seed={persona.id}
                                  className="size-5 rounded-full shrink-0"
                                />
                                <span className="text-xs font-medium shrink-0 truncate max-w-20">
                                  {persona.name}
                                </span>
                                {extraStr && (
                                  <span className="text-[10px] text-muted-foreground/60 truncate">
                                    {extraStr}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {panel.personas.length > 3 && (
                            <span className="text-[10px] text-muted-foreground/50">
                              {t("ListPage.andMore", { count: panel.personas.length - 3 })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <span>{t("personaCount", { count: panel.personas.length })}</span>
                          {(panel.usageCount.discussions > 0 ||
                            panel.usageCount.interviews > 0) && (
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

      {/* Delete Confirmation */}
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
