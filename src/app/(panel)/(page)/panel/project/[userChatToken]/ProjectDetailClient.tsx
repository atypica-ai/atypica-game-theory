"use client";
import { ConfirmPanelResearchPlanMessage } from "@/app/(panel)/tools/confirmPanelResearchPlan/ConfirmPanelResearchPlanMessage";
import type { ConfirmPanelResearchPlanOutput } from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UserChatExtra } from "@/prisma/client";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
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
    extra: UserChatExtra;
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
  // Use SWR for project progress polling
  const { data: progress } = useSWR(
    ["projectProgress", project.token],
    async () => {
      const result = await fetchProjectProgress(project.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: initialProgress ?? undefined,
      refreshInterval: (data) => (data?.status === "running" ? 5000 : 0),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const isRunning = progress?.status === "running";

  // Use SWR for research data polling
  const { data: researchData } = useSWR(
    ["projectResearch", project.token],
    async () => {
      const result = await fetchProjectResearchByToken(project.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: {
        discussions,
        interviewBatches,
        totalPersonas,
        pendingConfirmPlan: initialPendingConfirmPlan,
      },
      refreshInterval: isRunning ? 5000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const projectDiscussions = useMemo(() => researchData?.discussions ?? [], [researchData?.discussions]);
  const projectInterviewBatches = useMemo(() => researchData?.interviewBatches ?? [], [researchData?.interviewBatches]);
  const projectTotalPersonas = researchData?.totalPersonas ?? 0;
  const pendingConfirmPlan = researchData?.pendingConfirmPlan ?? null;

  const hasDiscussions = projectDiscussions.length > 0;
  const hasInterviews = projectInterviewBatches.length > 0;

  // Determine available tabs and default
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = [];
    if (hasDiscussions) tabs.push("discussion");
    if (hasInterviews) tabs.push("interviews");
    return tabs;
  }, [hasDiscussions, hasInterviews]);

  // State classification for clear logic flow
  const hasContent = availableTabs.length > 0;

  const [activeTab, setActiveTab] = useState<TabType>(availableTabs[0] ?? "discussion");

  // Discussion selector (when multiple discussions exist)
  const [selectedDiscussionIndex, setSelectedDiscussionIndex] = useState(0);

  // Interview batch selector
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    projectInterviewBatches[0]?.id ?? null,
  );
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

  // Use SWR for discussion detail (load on selection change)
  const selectedDiscussion = projectDiscussions[selectedDiscussionIndex];
  const { data: currentDiscussionDetail } = useSWR(
    selectedDiscussion ? ["discussionDetail", selectedDiscussion.token] : null,
    async () => {
      const result = await fetchDiscussionDetail(selectedDiscussion!.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: discussionDetail ?? undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Handle research plan confirmation
  const handleConfirmPlan = useCallback(
    async (output: ConfirmPanelResearchPlanOutput) => {
      if (!pendingConfirmPlan) return;
      await submitResearchConfirmation(project.token, pendingConfirmPlan.toolCallId, output);
      // SWR will pick up the change on next poll
    },
    [pendingConfirmPlan, project.token],
  );

  // Build flat selector items for DiscussionView
  const selectorItems = useMemo(() => {
    const items: { label: string; icon: "discussion" | "interview" }[] = [];
    for (let i = 0; i < projectDiscussions.length; i++) {
      items.push({ label: t("discussionNumber", { number: i + 1 }), icon: "discussion" });
    }
    for (let i = 0; i < projectInterviewBatches.length; i++) {
      items.push({ label: t("interviewNumber", { number: i + 1 }), icon: "interview" });
    }
    return items;
  }, [projectDiscussions.length, projectInterviewBatches.length, t]);

  // Current selected index in the flat list
  const selectorSelectedIndex =
    activeTab === "discussion"
      ? selectedDiscussionIndex
      : projectDiscussions.length +
        projectInterviewBatches.findIndex((b) => b.id === selectedBatchId);

  const handleSelectorSelect = useCallback(
    (index: number) => {
      if (index < projectDiscussions.length) {
        setActiveTab("discussion");
        setSelectedDiscussionIndex(index);
      } else {
        const batchIndex = index - projectDiscussions.length;
        const batch = projectInterviewBatches[batchIndex];
        if (batch) {
          setActiveTab("interviews");
          setSelectedBatchId(batch.id);
        }
      }
    },
    [projectDiscussions.length, projectInterviewBatches],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Content area — no header, full height */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!hasContent ? (
          /* No research output yet - show status with link to agent chat */
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
                {isRunning ? phaseLabel : t("idle")}
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
        ) : activeTab === "discussion" && currentDiscussionDetail ? (
          <DiscussionView
            timeline={currentDiscussionDetail.timeline}
            personas={currentDiscussionDetail.personas}
            panel={{ id: panelId, title: panelTitle }}
            project={project}
            selector={
              selectorItems.length > 1
                ? {
                    items: selectorItems,
                    selectedIndex: selectorSelectedIndex,
                    onSelect: handleSelectorSelect,
                  }
                : undefined
            }
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
