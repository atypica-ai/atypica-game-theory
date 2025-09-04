"use client";
import {
  createPersonaInterviewSession,
  optimizeInterviewQuestions,
} from "@/app/(interviewProject)/actions";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  BotIcon,
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

  return (
    <div className="space-y-6 my-6 container max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-4">
            <span>
              {t("title")} #{project.id}
            </span>
            <ShareInterviewProjectButton interviewProject={project} />
          </h1>
          <p className="text-muted-foreground">{formatDate(project.createdAt, locale)}</p>
        </div>
        {!readOnly ? (
          <div className="ml-auto flex items-center space-x-2">
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquareIcon className="h-5 w-5 mr-2" />
              {t("projectBrief")}
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReoptimizeQuestions}
                disabled={optimizing || project.extra?.processing}
              >
                <SparklesIcon className="h-3 w-3 mr-1" />
                {t("reoptimizeQuestions")}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed text-sm max-h-64 overflow-scroll scrollbar-thin">
            {project.brief}
          </p>
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
    </div>
  );
}
