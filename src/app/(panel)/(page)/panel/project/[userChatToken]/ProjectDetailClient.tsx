"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Loader2, MessageSquare, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { DiscussionSummary, PanelDiscussionDetail, PanelInterview } from "./actions";
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
  interviews: PanelInterview[];
  totalPersonas: number;
}

type TabType = "discussion" | "interviews";

export function ProjectDetailClient({
  panelId,
  panelTitle,
  project,
  discussions,
  discussionDetail,
  interviews,
  totalPersonas,
}: ProjectDetailClientProps) {
  const t = useTranslations("PersonaPanel.ProjectDetailPage");
  const isRunning = project.backgroundToken != null;

  const hasDiscussions = discussions.length > 0 && discussionDetail != null;
  const hasInterviews = interviews.length > 0;

  // Determine available tabs and default
  const availableTabs: TabType[] = [];
  if (hasDiscussions) availableTabs.push("discussion");
  if (hasInterviews) availableTabs.push("interviews");

  const [activeTab, setActiveTab] = useState<TabType>(availableTabs[0] ?? "discussion");

  // Discussion selector (when multiple discussions exist)
  const [selectedDiscussionIndex, setSelectedDiscussionIndex] = useState(0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4">
        <Link
          href={`/panel/${panelId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="size-3" />
          {panelTitle || t("backToPanel")}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-medium tracking-tight line-clamp-2 flex-1">
            {project.title}
          </h1>
          {isRunning && (
            <Badge variant="outline" className="text-xs font-normal gap-1 shrink-0">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              {t("agentRunning")}
            </Badge>
          )}
        </div>

        {/* Tab nav + agent chat link */}
        <div className="flex items-center gap-1 mt-3">
          {hasDiscussions && (
            <button
              onClick={() => setActiveTab("discussion")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === "discussion"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <MessageSquare className="size-3" />
              {t("discussion")}
              {discussions.length > 1 && (
                <span className="text-muted-foreground/60 ml-0.5">({discussions.length})</span>
              )}
            </button>
          )}
          {hasInterviews && (
            <button
              onClick={() => setActiveTab("interviews")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === "interviews"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Users className="size-3" />
              {t("interviews")}
            </button>
          )}

          <div className="flex-1" />

          {/* Discussion selector if multiple */}
          {activeTab === "discussion" && discussions.length > 1 && (
            <div className="flex items-center gap-1">
              {discussions.map((d, i) => (
                <button
                  key={d.token}
                  onClick={() => setSelectedDiscussionIndex(i)}
                  className={cn(
                    "size-6 rounded text-xs font-medium transition-colors",
                    i === selectedDiscussionIndex
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          <Link
            href={`/study/${project.token}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {t("viewAgentChat")}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {/* Content area */}
      {availableTabs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            {isRunning ? (
              <>
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("noContent")}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noContent")}</p>
            )}
            <p className="text-xs text-muted-foreground/60">{t("noContentDescription")}</p>
          </div>
        </div>
      ) : activeTab === "discussion" && discussionDetail ? (
        <DiscussionView timeline={discussionDetail.timeline} personas={discussionDetail.personas} />
      ) : activeTab === "interviews" ? (
        <InterviewsView panelId={panelId} interviews={interviews} totalPersonas={totalPersonas} />
      ) : null}
    </div>
  );
}
