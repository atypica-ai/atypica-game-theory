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
import { ExternalLink, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  fetchPersonaPanelById,
  PersonaPanelWithDetails,
  ResearchProject,
  updatePanelPersonas,
} from "./actions";

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

  const getKindLabel = (kind: string) => {
    if (kind === "study") return t("DetailPage.projectKind.study");
    if (kind === "scout") return t("DetailPage.projectKind.scout");
    if (kind === "interview") return t("DetailPage.projectKind.interview");
    if (kind === "universal") return t("DetailPage.projectKind.universal");
    if (kind === "fastInsight") return t("DetailPage.projectKind.fastInsight");
    if (kind === "productRnD") return t("DetailPage.projectKind.productRnD");
    return t("DetailPage.projectKind.default");
  };

  return (
    <FitToViewport>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* Header */}
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

        {/* Research Projects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
              {t("DetailPage.researchProjects")}
            </h2>
            <Link
              href={`/panel/${panel.id}/newstudy`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              {t("DetailPage.newProject")}
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-8 px-4 text-center">
              <p className="text-sm text-muted-foreground">{t("DetailPage.noProjects")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t("DetailPage.noProjectsDescription")}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border">
              {projects.map((project) => (
                <Link
                  key={project.token}
                  href={`/panel/project/${project.token}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">
                        {project.title || project.token.slice(0, 8)}
                      </span>
                      {project.backgroundToken && (
                        <span className="relative flex size-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full size-2 bg-green-500" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{getKindLabel(project.kind)}</span>
                      <span>·</span>
                      <span>{formatDate(project.createdAt, locale)}</span>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Personas */}
        <div className="space-y-3">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    {/* Avatar */}
                    <HippyGhostAvatar
                      seed={persona.id}
                      className="size-10 rounded-lg shrink-0 bg-muted/50"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Name */}
                      <div className="text-sm font-medium leading-snug truncate pr-6">
                        {persona.name}
                      </div>

                      {/* Extra summary */}
                      {extraSummary && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {extraSummary}
                        </div>
                      )}

                      {/* Source + Tier */}
                      <div className="flex items-center gap-1.5">
                        {persona.source && (
                          <span className="text-[10px] text-muted-foreground/50">
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

                  {/* Tags — compact at bottom */}
                  {persona.tags && persona.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border/50">
                      {persona.tags.slice(0, 4).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {persona.tags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground/40">
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
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                        {getTierLabel(selectedPersona.tier)}
                      </Badge>
                      <span>·</span>
                      <span>{formatDate(selectedPersona.createdAt, locale)}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Extra fields as structured grid */}
                {selectedPersona.extra && getExtraFields(selectedPersona.extra).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getExtraFields(selectedPersona.extra).map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                          {label}
                        </div>
                        <div className="text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
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

                {/* Prompt */}
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                    Persona Profile
                  </div>
                  <div className="text-xs leading-relaxed p-4 bg-muted/30 rounded-lg border max-h-72 overflow-y-auto">
                    <Streamdown mode="static">{extractSummaryFromPrompt(selectedPersona.prompt)}</Streamdown>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Persona Dialog */}
      <SelectPersonaDialog
        open={showAddPersona}
        onOpenChange={setShowAddPersona}
        onSelect={handleAddPersonas}
      />
    </FitToViewport>
  );
}
