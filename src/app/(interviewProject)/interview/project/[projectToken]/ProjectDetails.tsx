"use client";
import {
  createPersonaInterviewSession,
  optimizeInterviewQuestions,
} from "@/app/(interviewProject)/actions";
import { EditProjectDialog } from "@/app/(interviewProject)/components/EditProjectDialog";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  BotIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  InfoIcon,
  Loader2Icon,
  MessageSquareIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { InterviewReportsSection } from "./InterviewReportsSection";
import { InterviewSessionsSection } from "./InterviewSessionsSection";
import { InviteDialog } from "./InviteDialog";
import { ProjectStatsSection } from "./ProjectStatsSection";
import { ShareInterviewProjectButton } from "./ShareInterviewProjectButton";

export function ProjectDetails({
  project,
  readOnly = false,
}: {
  project: {
    id: number;
    token: string;
    brief: string;
    extra: InterviewProjectExtra;
    createdAt: Date;
  };
  readOnly?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectDetails");
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [, setCreatingPersonaSessions] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Polling mechanism - refresh every 10 seconds during processing
  useEffect(() => {
    if (!project.extra?.processing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [project.extra?.processing, router]);

  const onSelectPersonas = useCallback(
    async (selectedIds: number[]) => {
      setCreatingPersonaSessions(true);
      try {
        for (const personaId of selectedIds) {
          const result = await createPersonaInterviewSession({
            projectId: project.id,
            personaId,
          });
          if (!result.success) throw result;
        }
      } catch (error) {
        toast.error((error as Error).message || t("createInterviewFailed"));
      } finally {
        setCreatingPersonaSessions(false);
        window.location.reload();
      }
    },
    [project.id, t],
  );

  const handleReoptimizeQuestions = useCallback(async () => {
    setOptimizing(true);
    try {
      const result = await optimizeInterviewQuestions(project.id);
      if (!result.success) throw result;
      toast.success(t("reoptimizeQuestions"));
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message || "优化问题失败");
    } finally {
      setOptimizing(false);
    }
  }, [project.id, t]);

  const handleProjectUpdated = useCallback(() => {
    // Refresh the page to show updated data
    router.refresh();
  }, [router]);

  // Check if brief text is long (roughly estimate if it would exceed 10 lines)
  const isBriefLong = project.brief.length > 600 || project.brief.split("\n").length > 10;

  // Format brief for display - replace markdown headers with emojis
  const formatBriefForDisplay = (text: string) => {
    return text.replace(/\n*## Interview Questions\n*/g, "\n\n💬\n");
  };

  return (
    <div className="space-y-6 my-6 container max-w-6xl mx-auto px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-4">
            <span>
              {t("title")} #{project.id}
            </span>
            <ShareInterviewProjectButton interviewProject={project} />
          </h1>
          <p className="text-muted-foreground text-sm">{formatDate(project.createdAt, locale)}</p>
        </div>
        {!readOnly ? (
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <Share2Icon className="h-4 w-4" />
              {t("interviewHuman")}
            </Button>
            <Button variant="outline" onClick={() => setPersonaDialogOpen(true)}>
              <BotIcon className="h-4 w-4" />
              {t("interviewAI")}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Project Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center">
              <MessageSquareIcon className="h-5 w-5 mr-2" />
              {t("projectBrief")}
            </div>
            {!readOnly && (
              <>
                <div className="ml-auto" />
                <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <EditIcon className="h-3 w-3 mr-1" />
                  {t("editProject")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReoptimizeQuestions}
                  disabled={optimizing || project.extra?.processing}
                >
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  {t("reoptimizeQuestions")}
                </Button>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p
              className={`whitespace-pre-wrap leading-relaxed text-sm ${
                !briefExpanded && isBriefLong ? "line-clamp-10" : ""
              }`}
            >
              {formatBriefForDisplay(project.brief)}
            </p>
            {isBriefLong && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBriefExpanded(!briefExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {briefExpanded ? (
                  <>
                    <ChevronUpIcon className="h-4 w-4 mr-1" />
                    {t("showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-4 w-4 mr-1" />
                    {t("showMore")}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optimized Questions */}
      {(project.extra?.processing || project.extra?.optimizedQuestions) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2" />
                {t("optimizedQuestions")}
              </div>
              {project.extra?.optimizationReason && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {project.extra.optimizationReason}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("optimizedQuestionsDescription")}
            </p>
          </CardHeader>
          <CardContent>
            {project.extra?.processing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2Icon className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("optimizing")}</p>
                </div>
              </div>
            ) : project.extra?.optimizedQuestions && project.extra.optimizedQuestions.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {project.extra.optimizedQuestions.map((question, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <ProjectStatsSection projectToken={project.token} readOnly={readOnly} />

      {/* Sessions List */}
      <InterviewSessionsSection projectToken={project.token} readOnly={readOnly} />

      {/* Reports Section */}
      <InterviewReportsSection project={project} readOnly={readOnly} />

      {!readOnly && (
        <InviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          projectId={project.id}
        />
      )}

      {!readOnly && (
        <SelectPersonaDialog
          open={personaDialogOpen}
          onOpenChange={setPersonaDialogOpen}
          onSelect={onSelectPersonas}
        />
      )}

      {!readOnly && (
        <EditProjectDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onProjectUpdated={handleProjectUpdated}
          mode="edit"
          projectId={project.id}
          initialBrief={project.brief}
        />
      )}
    </div>
  );
}
