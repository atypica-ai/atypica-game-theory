"use client";
import {
  createPersonaInterviewSession,
  deleteInterviewQuestion,
  optimizeInterviewQuestions,
  updateInterviewQuestion,
} from "@/app/(interviewProject)/actions";
import { EditProjectDialog } from "@/app/(interviewProject)/components/EditProjectDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  BotIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  ListIcon,
  Loader2Icon,
  MessageSquareIcon,
  SparklesIcon,
  TrashIcon,
  User2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EditQuestionDialog, QuestionData } from "./EditQuestionDialog";
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
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | undefined>();
  const [questionEditDialogOpen, setQuestionEditDialogOpen] = useState(false);

  // Polling mechanism - refresh every 10 seconds during processing
  useEffect(() => {
    if (!project.extra?.processing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [project.extra?.processing, router]);

  const onSelectPersonas = useCallback(
    async (selectedTokens: string[]) => {
      setCreatingPersonaSessions(true);
      try {
        for (const personaToken of selectedTokens) {
          const result = await createPersonaInterviewSession({
            projectId: project.id,
            personaToken,
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

  const handleGenerateQuestions = useCallback(async () => {
    setOptimizing(true);
    try {
      const result = await optimizeInterviewQuestions(project.id);
      if (!result.success) throw result;
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOptimizing(false);
    }
  }, [project.id, t]);

  const handleProjectUpdated = useCallback(() => {
    // Refresh the page to show updated data
    router.refresh();
  }, [router]);

  const handleEditQuestion = useCallback((index: number, question: QuestionData) => {
    setEditingQuestionIndex(index);
    setEditingQuestion(question);
    setQuestionEditDialogOpen(true);
  }, []);

  const handleSaveQuestion = useCallback(
    async (questionData: QuestionData) => {
      if (editingQuestionIndex === undefined) return;

      try {
        const result = await updateInterviewQuestion(
          project.id,
          editingQuestionIndex,
          questionData,
        );
        if (!result.success) {
          toast.error(result.message || t("questionUpdateFailed"));
          return;
        }
        toast.success(t("questionUpdated"));
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message || t("questionUpdateFailed"));
      }
    },
    [editingQuestionIndex, project.id, router, t],
  );

  const handleDeleteQuestion = useCallback(
    async (index: number) => {
      try {
        const result = await deleteInterviewQuestion(project.id, index);
        if (!result.success) {
          toast.error(result.message || t("questionDeleteFailed"));
          return;
        }
        toast.success(t("questionDeleted"));
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message || t("questionDeleteFailed"));
      }
    },
    [project.id, router, t],
  );

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
              <User2Icon className="size-4" />
              {t("interviewHuman")}
            </Button>
            <Button variant="outline" onClick={() => setPersonaDialogOpen(true)}>
              <BotIcon className="size-4" />
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
                  <EditIcon className="size-4" />
                  {t("editProject")}
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
            {project.extra?.questionTypePreference && (
              <div className="mt-4 pt-2 border-t text-sm">
                <span className="text-muted-foreground mr-1">{t("questionTypePreference")}</span>
                <span>
                  {project.extra.questionTypePreference === "open-ended" &&
                    t("questionTypeOpenEnded")}
                  {project.extra.questionTypePreference === "multiple-choice" &&
                    t("questionTypeMultipleChoice")}
                  {project.extra.questionTypePreference === "mixed" && t("questionTypeMixed")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListIcon className="h-5 w-5 mr-2" />
            {t("questionList")}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t("questionListDescription")}</p>
        </CardHeader>
        <CardContent>
          {project.extra?.processing ? (
            // Generating state
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm">{t("optimizing")}</p>
            </div>
          ) : !project.extra?.questions || project.extra.questions.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12">
              <ListIcon className="h-8 w-8 mb-4 opacity-50 text-muted-foreground" />
              <p className="text-sm mb-4 text-muted-foreground">{t("noQuestions")}</p>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateQuestions}
                  disabled={optimizing}
                >
                  <SparklesIcon className="size-4" />
                  {t("generateQuestions")}
                </Button>
              )}
            </div>
          ) : (
            // Questions list
            <div className="space-y-2">
              {project.extra.questions.map((question, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed break-words">{question.text}</p>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditQuestion(index, question)}
                        className="h-8 px-2"
                      >
                        <EditIcon className="h-3 w-3 mr-1" />
                        {t("edit")}
                      </Button>
                      <ConfirmDialog
                        title={`${t("delete")}?`}
                        description={question.text}
                        onConfirm={() => handleDeleteQuestion(index)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          projectExtra={project.extra}
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
          projectId={project.id}
          initialBrief={project.brief}
          initialQuestionTypePreference={project.extra?.questionTypePreference}
        />
      )}

      {!readOnly && (
        <EditQuestionDialog
          open={questionEditDialogOpen}
          onOpenChange={setQuestionEditDialogOpen}
          question={editingQuestion || null}
          questionIndex={editingQuestionIndex}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
}
