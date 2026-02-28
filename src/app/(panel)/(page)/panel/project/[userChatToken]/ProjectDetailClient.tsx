"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import type { ConfirmPanelResearchPlanOutput } from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Loader2, MessageSquare, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DiscussionSummary,
  InterviewBatch,
  PanelDiscussionDetail,
  PendingConfirmPlan,
  ProjectProgress,
} from "./actions";
import {
  fetchDiscussionDetail,
  fetchProjectProgress,
  fetchProjectResearchByToken,
  submitResearchConfirmation,
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
    backgroundToken: string | null;
    createdAt: Date;
  };
  discussions: DiscussionSummary[];
  discussionDetail: PanelDiscussionDetail | null;
  interviewBatches: InterviewBatch[];
  totalPersonas: number;
  initialProgress: ProjectProgress | null;
  initialPendingConfirmPlan: PendingConfirmPlan | null;
}

type TabType = "discussion" | "interviews";

export function ProjectDetailClient({
  panelId,
  panelTitle,
  project,
  discussions,
  discussionDetail,
  interviewBatches,
  totalPersonas,
  initialProgress,
  initialPendingConfirmPlan,
}: ProjectDetailClientProps) {
  const t = useTranslations("PersonaPanel.ProjectDetailPage");
  const [projectDiscussions, setProjectDiscussions] = useState(discussions);
  const [projectInterviewBatches, setProjectInterviewBatches] = useState(interviewBatches);
  const [projectTotalPersonas, setProjectTotalPersonas] = useState(totalPersonas);
  const [progress, setProgress] = useState(initialProgress);
  const [pendingConfirmPlan, setPendingConfirmPlan] = useState(initialPendingConfirmPlan);
  const [runtimeStatus, setRuntimeStatus] = useState<"running" | "completed">(
    project.backgroundToken ? "running" : "completed",
  );
  const isRunning = runtimeStatus === "running";

  const hasDiscussions = projectDiscussions.length > 0;
  const hasInterviews = projectInterviewBatches.length > 0;

  // Determine available tabs and default
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = [];
    if (hasDiscussions) tabs.push("discussion");
    if (hasInterviews) tabs.push("interviews");
    return tabs;
  }, [hasDiscussions, hasInterviews]);

  const [activeTab, setActiveTab] = useState<TabType>(availableTabs[0] ?? "discussion");

  // Discussion selector (when multiple discussions exist)
  const [selectedDiscussionIndex, setSelectedDiscussionIndex] = useState(0);
  const [currentDiscussionDetail, setCurrentDiscussionDetail] =
    useState<PanelDiscussionDetail | null>(discussionDetail);

  // Interview batch selector
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    projectInterviewBatches[0]?.id ?? null,
  );
  const statusLabel = progress?.status === "running" ? t("statusRunning") : t("statusCompleted");
  const phaseLabelMap: Record<NonNullable<typeof progress>["phase"], string> = {
    planning: t("phasePlanning"),
    researching: t("phaseResearching"),
    discussion: t("phaseDiscussion"),
    interviews: t("phaseInterviews"),
    synthesizing: t("phaseSynthesizing"),
    completed: t("phaseCompleted"),
  };
  const phaseLabel = progress ? phaseLabelMap[progress.phase] : t("phasePlanning");

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (availableTabs.includes(activeTab)) return;
    setActiveTab(availableTabs[0]);
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (selectedDiscussionIndex < projectDiscussions.length) return;
    setSelectedDiscussionIndex(0);
  }, [projectDiscussions.length, selectedDiscussionIndex]);

  useEffect(() => {
    const selectedDiscussion = projectDiscussions[selectedDiscussionIndex];
    if (!selectedDiscussion) {
      setCurrentDiscussionDetail(null);
      return;
    }
    if (currentDiscussionDetail?.timeline.token === selectedDiscussion.token) return;

    let canceled = false;
    const loadDiscussion = async () => {
      const result = await fetchDiscussionDetail(selectedDiscussion.token);
      if (!canceled && result.success) {
        setCurrentDiscussionDetail(result.data);
      }
    };
    loadDiscussion();
    return () => {
      canceled = true;
    };
  }, [currentDiscussionDetail?.timeline.token, projectDiscussions, selectedDiscussionIndex]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      const [progressResult, researchResult] = await Promise.all([
        fetchProjectProgress(project.token),
        fetchProjectResearchByToken(project.token),
      ]);
      if (progressResult.success) {
        setProgress(progressResult.data);
        setRuntimeStatus(progressResult.data.status);
      }
      if (researchResult.success) {
        setProjectDiscussions(researchResult.data.discussions);
        setProjectInterviewBatches(researchResult.data.interviewBatches);
        setProjectTotalPersonas(researchResult.data.totalPersonas);
        setPendingConfirmPlan(researchResult.data.pendingConfirmPlan);

        if (
          selectedDiscussionIndex === 0 &&
          researchResult.data.discussions.length > 0 &&
          !currentDiscussionDetail
        ) {
          const firstDetail = await fetchDiscussionDetail(researchResult.data.discussions[0].token);
          if (firstDetail.success) {
            setCurrentDiscussionDetail(firstDetail.data);
          }
        }
      }
    };

    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentDiscussionDetail, project.token, selectedDiscussionIndex]);

  // Handle research plan confirmation
  const handleConfirmPlan = useCallback(
    async (output: ConfirmPanelResearchPlanOutput) => {
      if (!pendingConfirmPlan) return;
      await submitResearchConfirmation(project.token, pendingConfirmPlan.toolCallId, output);
      setPendingConfirmPlan(null); // Clear immediately — polling will pick up the new state
    },
    [pendingConfirmPlan, project.token],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar — centered title layout */}
      <div className="border-b border-border px-6 py-3">
        {/* Title row - three columns */}
        <div className="flex items-center gap-4 mb-3">
          {/* Left: Back button + Panel name */}
          <Link
            href={`/panel/${panelId}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            {panelTitle || t("backToPanel")}
          </Link>

          {/* Center: Project Title */}
          <div className="flex-1 text-center min-w-0 px-8">
            <h1 className="text-base font-medium tracking-tight truncate">{project.title}</h1>
          </div>

          {/* Right: View Agent Chat */}
          <Link
            href={`/universal/${project.token}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 inline-flex items-center gap-1"
          >
            {t("viewAgentChat")}
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Research items row - flat list */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {/* Discussions */}
          {projectDiscussions.map((discussion, index) => (
            <button
              key={discussion.token}
              onClick={() => {
                setActiveTab("discussion");
                setSelectedDiscussionIndex(index);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === "discussion" && selectedDiscussionIndex === index
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <MessageSquare className="size-3" />
              {t("discussionNumber", { number: index + 1 })}
            </button>
          ))}

          {/* Interviews */}
          {projectInterviewBatches.map((batch, index) => (
            <button
              key={batch.id}
              onClick={() => {
                setActiveTab("interviews");
                setSelectedBatchId(batch.id);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === "interviews" && selectedBatchId === batch.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Users className="size-3" />
              {t("interviewNumber", { number: index + 1 })}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {availableTabs.length === 0 ? (
          /* Agent running — no research output yet */
          <div className="flex-1 flex items-center justify-center p-6 h-full">
            <div className="w-full max-w-xl border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/60" />
                )}
                <p className="text-sm font-medium">
                  {isRunning ? t("agentRunning") : t("noContent")}
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {t("status")}: {statusLabel}
                </p>
                <p>
                  {t("phase")}: {phaseLabel}
                </p>
                {progress?.latestStep && (
                  <p>
                    {t("latestStep")}: {progress.latestStep}
                  </p>
                )}
              </div>

              {progress?.recentSteps && progress.recentSteps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("recentSteps")}</p>
                  <div className="space-y-1">
                    {progress.recentSteps.slice(0, 4).map((step, i) => (
                      <p key={`${step}-${i}`} className="text-xs text-muted-foreground">
                        {i + 1}. {step}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {progress?.lastMessage && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("agentOutput")}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {progress.lastMessage}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground/60">{t("noContentDescription")}</p>
            </div>
          </div>
        ) : activeTab === "discussion" && currentDiscussionDetail ? (
          <DiscussionView
            timeline={currentDiscussionDetail.timeline}
            personas={currentDiscussionDetail.personas}
          />
        ) : activeTab === "discussion" ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground h-full">
            <Loader2 className="size-4 animate-spin mr-2" />
            {t("agentRunning")}
          </div>
        ) : activeTab === "interviews" ? (
          <InterviewsView
            userChatToken={project.token}
            interviewBatches={projectInterviewBatches}
            totalPersonas={projectTotalPersonas}
            selectedBatchId={selectedBatchId}
            onBatchSelect={setSelectedBatchId}
          />
        ) : null}
      </div>

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
