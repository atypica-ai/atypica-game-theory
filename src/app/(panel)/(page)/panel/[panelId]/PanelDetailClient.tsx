"use client";
import { fetchPersonasByTokens } from "@/app/(panel)/tools/requestSelectPersonas/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import { ExternalLink, MessageCircle, Mic, Plus, Trash2, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  deleteResearchProject,
  fetchPersonaPanelById,
  PersonaPanelWithDetails,
  ResearchProject,
  type ResearchType,
  updatePanelPersonas,
} from "./actions";
import { NewPanelProjectDialog } from "./NewPanelProjectDialog";

type PanelData = ExtractServerActionData<typeof fetchPersonaPanelById>;

/** Build attribute fields based on role */
function getExtraFields(extra: PersonaExtra): Array<{ label: string; value: string }> {
  if (!extra) return [];
  const fields: Array<{ label: string; value: string }> = [];

  if (extra.role === "consumer") {
    if (extra.ageRange) fields.push({ label: "Age", value: extra.ageRange });
    if (extra.location) fields.push({ label: "Location", value: extra.location });
    if (extra.title) fields.push({ label: "Title", value: extra.title });
  } else if (extra.role === "buyer") {
    if (extra.title) fields.push({ label: "Title", value: extra.title });
    if (extra.industry) fields.push({ label: "Industry", value: extra.industry });
    if (extra.organization) fields.push({ label: "Org", value: extra.organization });
  } else if (extra.role === "expert") {
    if (extra.title) fields.push({ label: "Title", value: extra.title });
    if (extra.industry) fields.push({ label: "Industry", value: extra.industry });
    if (extra.organization) fields.push({ label: "Org", value: extra.organization });
    if (extra.experience) fields.push({ label: "Exp", value: extra.experience });
  }

  return fields;
}

/** Compact inline summary */
function buildExtraSummary(extra: PersonaExtra): string {
  return getExtraFields(extra)
    .map((f) => f.value)
    .join(" · ");
}

function extractSummaryFromPrompt(prompt: string) {
  const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
  return match ? match[1] : prompt;
}

function getTierLabel(tier: number) {
  if (tier >= 2) return "T2";
  if (tier >= 1) return "T1";
  return "T0";
}

export function PanelDetailClient({
  panel,
  projects,
}: {
  panel: PanelData;
  projects: ResearchProject[];
}) {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<
    PersonaPanelWithDetails["personas"][number] | null
  >(null);
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [deletingProjectToken, setDeletingProjectToken] = useState<string | null>(null);

  // New project dialog state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectDefaultType, setNewProjectDefaultType] = useState<ResearchType>("focusGroup");

  const handleDeleteProject = async (projectToken: string) => {
    setDeletingProjectToken(projectToken);
    const result = await deleteResearchProject(projectToken);
    setDeletingProjectToken(null);

    if (result.success) {
      toast.success(t("DetailPage.deleteProjectSuccess"));
      router.refresh();
    } else {
      const message =
        result.code === "forbidden"
          ? t("DetailPage.cannotDeleteProjectWithContent")
          : result.message;
      toast.error(message);
    }
  };

  const handleAddPersonas = async (tokens: string[]) => {
    if (tokens.length === 0) return;
    const result = await fetchPersonasByTokens(tokens);
    if (!result.success) return;
    const newIds = result.data.map((p) => p.id);
    const merged = [...new Set([...panel.personaIds, ...newIds])];
    const updateResult = await updatePanelPersonas(panel.id, merged);
    if (updateResult.success) {
      router.refresh();
    }
  };

  const handleRemovePersona = async (personaId: number) => {
    const filtered = panel.personaIds.filter((id) => id !== personaId);
    const result = await updatePanelPersonas(panel.id, filtered);
    if (result.success) {
      toast.success(t("DetailPage.removeSuccess"));
      router.refresh();
    }
  };

  const openNewProjectDialog = (type: ResearchType) => {
    setNewProjectDefaultType(type);
    setShowNewProject(true);
  };

  const getKindLabel = (kind: string) => {
    if (kind === "study") return t("DetailPage.projectKind.study");
    if (kind === "scout") return t("DetailPage.projectKind.scout");
    if (kind === "interview") return t("DetailPage.projectKind.interview");
    if (kind === "universal") return t("DetailPage.projectKind.universal");
    if (kind === "fastInsight") return t("DetailPage.projectKind.fastInsight");
    if (kind === "productRnD") return t("DetailPage.projectKind.productRnD");
    return t("DetailPage.projectKind.default");
  };

  const researchCubes = [
    {
      type: "focusGroup" as const,
      icon: Users,
      label: t("DetailPage.projectType.focusGroup"),
    },
    {
      type: "userInterview" as const,
      icon: MessageCircle,
      label: t("DetailPage.projectType.userInterview"),
    },
    {
      type: "expertInterview" as const,
      icon: Mic,
      label: t("DetailPage.projectType.expertInterview"),
    },
  ];

  return (
    <FitToViewport>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* ─── Header ─── */}
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {panel.title || t("panelId", { id: panel.id })}
            </h1>
            {panel.instruction && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {panel.instruction}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDate(panel.createdAt, locale)}</span>
              <span>·</span>
              <span>{t("personaCount", { count: panel.personas.length })}</span>
              <span>·</span>
              <span>
                {t("discussions", { count: panel.usageCount.discussions })}
                {" / "}
                {t("interviews", { count: panel.usageCount.interviews })}
              </span>
            </div>
          </div>

          {/* ─── Content: responsive left-right ─── */}
          <div className="mt-8 flex flex-col lg:flex-row lg:gap-8">
            {/* Sidebar — first on mobile, right on desktop */}
            <div className="order-1 lg:order-2 w-full lg:w-80 lg:shrink-0 mb-8 lg:mb-0 lg:border-l lg:border-border lg:pl-8">
              {/* Quick Research */}
              <div>
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
                  {t("DetailPage.quickResearch")}
                </h3>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {researchCubes.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => openNewProjectDialog(type)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border border-border",
                        "hover:border-foreground/20 hover:bg-accent transition-all",
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Research Projects */}
              <div className="mt-6">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
                  {t("DetailPage.researchProjects")}
                </h3>

                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 mt-3">
                    {t("DetailPage.noProjects")}
                  </p>
                ) : (
                  <div className="mt-3 space-y-1">
                    {projects.map((project) => {
                      const { artifacts, interviews, discussions } = project.stats;
                      const hasResearchContent = interviews > 0 || discussions > 0;
                      const canDelete = artifacts === 0 && interviews === 0 && discussions === 0;
                      const href = hasResearchContent
                        ? `/panel/project/${project.token}`
                        : `/universal/${project.token}`;

                      return (
                        <Link
                          key={project.token}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm truncate">
                                {project.title || project.token.slice(0, 8)}
                              </span>
                              {project.extra?.runId && (
                                <span className="relative flex size-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full size-1.5 bg-green-500" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                              <span>{getKindLabel(project.kind)}</span>
                              <span>·</span>
                              <span>{formatDate(project.createdAt, locale)}</span>
                            </div>
                            {(artifacts > 0 || interviews > 0 || discussions > 0) && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground/60">
                                {artifacts > 0 && (
                                  <span>
                                    {t("DetailPage.stats.artifacts", { count: artifacts })}
                                  </span>
                                )}
                                {interviews > 0 && (
                                  <>
                                    {artifacts > 0 && <span>·</span>}
                                    <span>
                                      {t("DetailPage.stats.interviews", { count: interviews })}
                                    </span>
                                  </>
                                )}
                                {discussions > 0 && (
                                  <>
                                    {(artifacts > 0 || interviews > 0) && <span>·</span>}
                                    <span>
                                      {t("DetailPage.stats.discussions", { count: discussions })}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {canDelete && (
                              <div
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <ConfirmDialog
                                  title={t("DetailPage.confirmDeleteProject")}
                                  description={t("DetailPage.deleteProjectWarning")}
                                  onConfirm={() => handleDeleteProject(project.token)}
                                  variant="destructive"
                                >
                                  <button
                                    disabled={deletingProjectToken === project.token}
                                    className={cn(
                                      "size-6 rounded flex items-center justify-center hover:bg-muted",
                                      deletingProjectToken === project.token && "opacity-50",
                                    )}
                                  >
                                    <Trash2 className="size-3 text-muted-foreground" />
                                  </button>
                                </ConfirmDialog>
                              </div>
                            )}
                            <ExternalLink className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Personas — main area, second on mobile, left on desktop */}
            <div className="order-2 lg:order-1 flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
                  {t("personas")}
                </h2>
                <button
                  onClick={() => setShowAddPersona(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="size-3.5" />
                  {t("DetailPage.addPersona")}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {panel.personas.map((persona) => {
                  const extra = persona.extra;
                  const extraSummary = buildExtraSummary(extra);

                  return (
                    <div
                      key={persona.id}
                      className={cn(
                        "group relative border border-border rounded-lg p-4",
                        "hover:border-foreground/20 transition-all duration-300 cursor-pointer",
                      )}
                      onClick={() => setSelectedPersona(persona)}
                    >
                      {/* Remove button */}
                      <div
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ConfirmDialog
                          title={t("DetailPage.confirmRemovePersona")}
                          description={t("DetailPage.removePersonaWarning", { name: persona.name })}
                          onConfirm={() => handleRemovePersona(persona.id)}
                          variant="destructive"
                        >
                          <button className="size-7 rounded-md flex items-center justify-center hover:bg-muted">
                            <X className="size-3.5 text-muted-foreground" />
                          </button>
                        </ConfirmDialog>
                      </div>

                      <div className="flex gap-3">
                        <HippyGhostAvatar
                          seed={persona.id}
                          className="size-10 rounded-lg shrink-0 bg-muted/50"
                        />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="text-sm font-medium leading-snug truncate pr-6">
                            {persona.name}
                          </div>
                          {extraSummary && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {extraSummary}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            {persona.source && (
                              <span className="text-xs text-muted-foreground/50">
                                {persona.source}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1 font-normal text-muted-foreground/60 border-muted-foreground/20"
                            >
                              {getTierLabel(persona.tier)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {persona.tags && persona.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border/50">
                          {persona.tags.slice(0, 4).map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {persona.tags.length > 4 && (
                            <span className="text-xs text-muted-foreground/40">
                              +{persona.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Persona Detail Dialog ─── */}
      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPersona && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <HippyGhostAvatar
                    seed={selectedPersona.id}
                    className="size-14 rounded-xl shrink-0 bg-muted/50"
                  />
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl tracking-tight">
                      {selectedPersona.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{selectedPersona.source}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-xs h-4 px-1.5 font-normal">
                        {getTierLabel(selectedPersona.tier)}
                      </Badge>
                      <span>·</span>
                      <span>{formatDate(selectedPersona.createdAt, locale)}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {selectedPersona.extra && getExtraFields(selectedPersona.extra).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getExtraFields(selectedPersona.extra).map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                          {label}
                        </div>
                        <div className="text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPersona.tags && selectedPersona.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersona.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                    Persona Profile
                  </div>
                  <div className="text-xs leading-relaxed p-4 bg-muted/30 rounded-lg border max-h-72 overflow-y-auto">
                    <Streamdown mode="static">
                      {extractSummaryFromPrompt(selectedPersona.prompt)}
                    </Streamdown>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Add Persona Dialog ─── */}
      <SelectPersonaDialog
        open={showAddPersona}
        onOpenChange={setShowAddPersona}
        onSelect={handleAddPersonas}
      />

      {/* ─── New Project Dialog ─── */}
      <NewPanelProjectDialog
        panelId={panel.id}
        personas={panel.personas.map((p) => ({ id: p.id, name: p.name }))}
        defaultType={newProjectDefaultType}
        open={showNewProject}
        onOpenChange={setShowNewProject}
      />
    </FitToViewport>
  );
}
