"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import { ArrowRight, ExternalLink, MessageCircle, Mic, Plus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Streamdown } from "streamdown";
import {
  createUniversalAgentFromPanel,
  fetchPersonaPanelById,
  PersonaPanelWithDetails,
  ResearchProject,
} from "./actions";

type ProjectType = "userInterview" | "expertInterview" | "focusGroup";

type PanelData = ExtractServerActionData<typeof fetchPersonaPanelById>;

function getRoleLabel(
  role: PersonaExtra["role"],
  t: ReturnType<typeof useTranslations<"PersonaPanel">>,
) {
  if (role === "consumer") return t("DetailPage.attributes.roleType.consumer");
  if (role === "buyer") return t("DetailPage.attributes.roleType.buyer");
  return t("DetailPage.attributes.roleType.expert");
}

/** Build a compact attribute summary line based on role type */
function buildAttributeSummary(extra: PersonaExtra): string[] {
  const parts: string[] = [];
  if (!extra) return parts;

  // Role-aware: show the most relevant fields first
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
    if (extra.organization) parts.push(extra.organization);
    if (extra.experience) parts.push(extra.experience);
  }

  return parts;
}

function extractSummaryFromPrompt(prompt: string) {
  const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
  return match ? match[1] : prompt;
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
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectContent, setNewProjectContent] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType>("focusGroup");
  const [isPending, startTransition] = useTransition();

  const handleCreateProject = () => {
    if (!newProjectContent.trim()) return;
    startTransition(async () => {
      const question = newProjectContent.trim();
      const instructions =
        locale === "zh-CN"
          ? {
              userInterview: `请使用 interviewChat 工具对 Panel 中的人物进行一对一用户访谈。
研究问题：${question}
要求：
- 对每个人物进行独立的深度访谈
- 聚焦于消费者动机、使用场景和痛点
- 访谈结束后使用 generateReport 生成研究报告`,
              expertInterview: `请使用 interviewChat 工具对 Panel 中的专家人物进行一对一专家访谈。
研究问题：${question}
要求：
- 对每位专家进行独立的专业咨询
- 聚焦于行业趋势、专业见解和建议
- 访谈结束后使用 generateReport 生成研究报告`,
              focusGroup: `请使用 discussionChat 工具组织 Panel 中的人物进行焦点小组讨论。
研究问题：${question}
要求：
- 使用焦点小组模式，让所有人物同时参与讨论
- 聚焦于观点碰撞、共识发现和分歧点
- 讨论结束后使用 generateReport 生成研究报告`,
            }
          : {
              userInterview: `Use the interviewChat tool to conduct 1-on-1 user interviews with panel personas.
Research question: ${question}
Requirements:
- Conduct independent in-depth interviews with each persona
- Focus on consumer motivations, usage scenarios, and pain points
- After interviews, use generateReport to create a research report`,
              expertInterview: `Use the interviewChat tool to conduct 1-on-1 expert interviews with panel personas.
Research question: ${question}
Requirements:
- Conduct independent expert consultations with each persona
- Focus on industry trends, professional insights, and recommendations
- After interviews, use generateReport to create a research report`,
              focusGroup: `Use the discussionChat tool to facilitate a focus group discussion with panel personas.
Research question: ${question}
Requirements:
- Use focus group mode with all personas participating simultaneously
- Focus on opinion exchange, consensus discovery, and points of divergence
- After the discussion, use generateReport to create a research report`,
            };

      const content = instructions[selectedProjectType];
      const result = await createUniversalAgentFromPanel(panel.id, content);
      if (result.success) {
        setShowNewProject(false);
        setNewProjectContent("");
        setSelectedProjectType("focusGroup");
        router.push(`/panel/project/${result.data.token}`);
      }
    });
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
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-7">
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
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              {t("DetailPage.newProject")}
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {panel.personas.map((persona) => {
            const extra = persona.extra;
            const summaryParts = buildAttributeSummary(extra);

            return (
              <div
                key={persona.id}
                className={cn(
                  "group border border-border rounded-lg p-4",
                  "hover:border-green-500/30 transition-all duration-300 cursor-pointer",
                  "flex flex-col gap-2.5",
                )}
                onClick={() => setSelectedPersona(persona)}
              >
                {/* Role badge */}
                {extra?.role && (
                  <Badge
                    variant="outline"
                    className="self-start text-xs px-2 py-0.5 font-normal text-muted-foreground border-muted-foreground/30"
                  >
                    {getRoleLabel(extra.role, t)}
                  </Badge>
                )}

                {/* Name */}
                <div className="text-sm font-medium leading-snug">{persona.name}</div>

                {/* Attribute summary */}
                {summaryParts.length > 0 && (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {summaryParts.join(" · ")}
                  </div>
                )}

                {/* Tags */}
                {persona.tags && persona.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {persona.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-xs text-muted-foreground/70">
                        #{tag}
                      </span>
                    ))}
                    {persona.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground/50">
                        +{persona.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Arrow */}
                <div className="flex justify-end">
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Persona Detail Dialog */}
      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPersona && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl tracking-tight">{selectedPersona.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2.5 text-xs">
                  <span>{selectedPersona.source}</span>
                  <span>·</span>
                  <span>{formatDate(selectedPersona.createdAt, locale)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Attributes as inline chips */}
                {selectedPersona.extra && Object.keys(selectedPersona.extra).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.extra.role && (
                      <Badge
                        variant="outline"
                        className="text-xs font-normal border-green-500/30 text-foreground"
                      >
                        {getRoleLabel(selectedPersona.extra.role, t)}
                      </Badge>
                    )}
                    {selectedPersona.extra.title && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.title}
                      </Badge>
                    )}
                    {selectedPersona.extra.ageRange && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.ageRange}
                      </Badge>
                    )}
                    {selectedPersona.extra.location && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.location}
                      </Badge>
                    )}
                    {selectedPersona.extra.industry && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.industry}
                      </Badge>
                    )}
                    {selectedPersona.extra.organization && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.organization}
                      </Badge>
                    )}
                    {selectedPersona.extra.experience && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.experience}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selectedPersona.tags && selectedPersona.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersona.tags.map((tag, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prompt */}
                <div className="text-xs leading-relaxed p-4 bg-muted/50 rounded-lg border max-h-80 overflow-y-auto">
                  <Streamdown>{extractSummaryFromPrompt(selectedPersona.prompt)}</Streamdown>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog
        open={showNewProject}
        onOpenChange={(v) => {
          if (isPending) return;
          setShowNewProject(v);
          if (!v) {
            setNewProjectContent("");
            setSelectedProjectType("focusGroup");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">
              {t("DetailPage.newProject")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("DetailPage.newProjectDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Project Type Selection */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {t("DetailPage.selectProjectType")}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { type: "userInterview" as const, icon: MessageCircle },
                    { type: "expertInterview" as const, icon: Mic },
                    { type: "focusGroup" as const, icon: Users },
                  ] as const
                ).map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedProjectType(type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all",
                      selectedProjectType === type
                        ? "border-foreground/30 bg-muted/50"
                        : "border-border hover:border-foreground/20",
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="font-medium">{t(`DetailPage.projectType.${type}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              value={newProjectContent}
              onChange={(e) => setNewProjectContent(e.target.value)}
              placeholder={t("DetailPage.newProjectPlaceholder")}
              className="min-h-[120px] text-sm resize-none"
              autoFocus
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectContent.trim() || isPending}
                size="sm"
              >
                {isPending ? t("DetailPage.creating") : t("DetailPage.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FitToViewport>
  );
}
