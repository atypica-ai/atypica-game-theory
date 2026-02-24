"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { InterviewBatch, PanelDiscussionDetail } from "./actions";

interface PersonasProgressProps {
  totalPersonas: number;
  activeTab: "discussion" | "interviews";
  currentDiscussionDetail: PanelDiscussionDetail | null;
  interviewBatches: InterviewBatch[];
  onPersonaClick?: (personaId: number) => void;
}

type PersonaStatus = "completed" | "in_progress" | "pending" | "participated";

interface PersonaWithStatus {
  id: number;
  name: string;
  status: PersonaStatus;
  progress?: number; // For interviews, estimated progress 0-100
}

export function PersonasProgress({
  totalPersonas,
  activeTab,
  currentDiscussionDetail,
  interviewBatches,
  onPersonaClick,
}: PersonasProgressProps) {
  const tInterview = useTranslations("PersonaPanel.InterviewsPage");
  const tDiscussion = useTranslations("PersonaPanel.DiscussionDetailPage");
  const [personas, setPersonas] = useState<PersonaWithStatus[]>([]);

  useEffect(() => {
    if (activeTab === "discussion" && currentDiscussionDetail) {
      // Calculate status based on discussion events
      const timeline = currentDiscussionDetail.timeline;
      const participantIds = new Set<number>();

      timeline.events.forEach((event) => {
        if (event.type === "persona-reply") {
          participantIds.add(event.personaId);
        }
      });

      const personasWithStatus = currentDiscussionDetail.personas.map((p) => ({
        id: p.id,
        name: p.name,
        status: participantIds.has(p.id) ? ("participated" as const) : ("pending" as const),
      }));

      setPersonas(personasWithStatus);
    } else if (activeTab === "interviews" && interviewBatches.length > 0) {
      // Calculate status based on interview status field
      // Deduplicate by personaId — keep the latest (last) entry per persona
      const allInterviews = interviewBatches.flatMap((batch) => batch.interviews);
      const deduped = new Map<number, (typeof allInterviews)[number]>();
      for (const interview of allInterviews) {
        deduped.set(interview.personaId, interview);
      }

      const personasWithStatus = [...deduped.values()].map((interview) => {
        if (interview.status === "completed") {
          return {
            id: interview.personaId,
            name: interview.personaName,
            status: "completed" as const,
            progress: 100,
          };
        }

        if (interview.status === "in-progress") {
          // Estimate progress based on time elapsed
          // Assume 5 minutes per interview as standard duration
          const startTime = new Date(interview.createdAt).getTime();
          const now = Date.now();
          const elapsedMs = now - startTime;
          const elapsedMinutes = elapsedMs / 1000 / 60;
          const standardDurationMinutes = 5;

          // Curve growth: never reach 100% until actually completed
          // Use formula: progress = 95 * (1 - e^(-elapsed/duration))
          const rawProgress = 95 * (1 - Math.exp(-elapsedMinutes / standardDurationMinutes));
          const progress = Math.min(95, Math.round(rawProgress));

          return {
            id: interview.personaId,
            name: interview.personaName,
            status: "in_progress" as const,
            progress,
          };
        }

        // status === "pending"
        return {
          id: interview.personaId,
          name: interview.personaName,
          status: "pending" as const,
        };
      });

      setPersonas(personasWithStatus);
    }
  }, [activeTab, currentDiscussionDetail, interviewBatches]);

  // Calculate overall progress
  const completedCount = personas.filter(
    (p) => p.status === "completed" || p.status === "participated",
  ).length;
  const overallProgress =
    totalPersonas > 0 ? Math.round((completedCount / totalPersonas) * 100) : 0;

  const getStatusColor = (status: PersonaStatus) => {
    switch (status) {
      case "completed":
      case "participated":
        return "text-green-500";
      case "in_progress":
        return "text-amber-500";
      case "pending":
        return "text-muted-foreground/40";
    }
  };

  const getStatusIcon = (status: PersonaStatus) => {
    switch (status) {
      case "completed":
      case "participated":
        return <CheckCircle2 className="size-3.5" />;
      case "in_progress":
        return <Loader2 className="size-3.5 animate-spin" />;
      case "pending":
        return <Circle className="size-3.5" />;
    }
  };

  const getStatusLabel = (status: PersonaStatus) => {
    switch (status) {
      case "completed":
        return tInterview("completed");
      case "participated":
        return tDiscussion("complete");
      case "in_progress":
        return tInterview("inProgress");
      case "pending":
        return tInterview("pending");
    }
  };

  return (
    <div className="w-64 border-r border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {activeTab === "discussion" ? tDiscussion("participants") : tInterview("title")}
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {completedCount}/{totalPersonas}
          </Badge>
        </div>

        {/* Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-lg font-bold">{overallProgress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            {
              status: activeTab === "discussion" ? "participated" : "completed",
              count: personas.filter((p) => p.status === "completed" || p.status === "participated")
                .length,
            },
            {
              status: "in_progress",
              count: personas.filter((p) => p.status === "in_progress").length,
            },
            {
              status: "pending",
              count: personas.filter((p) => p.status === "pending").length,
            },
          ].map(({ status, count }) => (
            <div key={status} className="flex items-center gap-1">
              <div className={cn("flex", getStatusColor(status as PersonaStatus))}>
                {getStatusIcon(status as PersonaStatus)}
              </div>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Persona List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2 space-y-1">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => onPersonaClick?.(persona.id)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md transition-all text-left",
                "hover:bg-muted/50",
                (persona.status === "completed" || persona.status === "participated") &&
                  "cursor-pointer",
                persona.status === "pending" && "opacity-50 cursor-default",
              )}
            >
              {/* Status Icon */}
              <div className={getStatusColor(persona.status)}>{getStatusIcon(persona.status)}</div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{persona.name}</div>
                {/* Progress bar for interviews */}
                {persona.status === "in_progress" && typeof persona.progress === "number" && (
                  <div className="mt-1 h-0.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${persona.progress}%` }}
                    />
                  </div>
                )}
                {/* Status label */}
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {getStatusLabel(persona.status)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
