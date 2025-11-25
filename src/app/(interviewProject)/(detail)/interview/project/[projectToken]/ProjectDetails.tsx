"use client";
import {
  createInterviewQuestion,
  deleteInterviewQuestion,
  optimizeInterviewQuestions,
  reorderInterviewQuestions,
  updateInterviewQuestion,
} from "@/app/(interviewProject)/(detail)/actions";
import { InviteDialog } from "@/app/(interviewProject)/(detail)/interview/invite/InviteDialog";
import { createPersonaInterviewSession } from "@/app/(interviewProject)/actions";
import { EditProjectDialog } from "@/app/(interviewProject)/components/EditProjectDialog";
import { QuestionData } from "@/app/(interviewProject)/types";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  BotIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  ListIcon,
  Loader2Icon,
  MessageSquareIcon,
  SparklesIcon,
  User2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EditQuestionDialog } from "./components/EditQuestionDialog";
import { InterviewReportsSection } from "./components/InterviewReportsSection";
import { InterviewSessionsSection } from "./components/InterviewSessionsSection";
import { ProjectStatsSection } from "./components/ProjectStatsSection";
import { ShareInterviewProjectButton } from "./components/ShareInterviewProjectButton";
import { SortableQuestionItem } from "./components/SortableQuestionItem";

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
  const [editingQuestion, setEditingQuestion] = useState<NonNullable<QuestionData> | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | undefined>();
  const [questionEditDialogOpen, setQuestionEditDialogOpen] = useState(false);

  // Use stable IDs for drag and drop
  // Map each question to a stable ID based on its initial position
  const [questionItems, setQuestionItems] = useState<
    Array<{ id: string; data: QuestionData; originalIndex: number }>
  >([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync question items with project data
  useEffect(() => {
    const questions = project.extra?.questions || [];
    const items = questions.map((q, index) => ({
      id: `question-${index}-${q.text.slice(0, 20)}`, // Stable ID based on initial index and text
      data: q,
      originalIndex: index,
    }));
    setQuestionItems(items);
  }, [project.extra?.questions]);

  // Polling mechanism - refresh every 10 seconds during processing
  useEffect(() => {
    if (!project.extra?.processing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [project.extra?.processing, router]);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = questionItems.findIndex((item) => item.id === active.id);
      const newIndex = questionItems.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Optimistically update UI
      const newItems = arrayMove(questionItems, oldIndex, newIndex);
      setQuestionItems(newItems);

      // Create index mapping for server (based on original index)
      const newOrder = newItems.map((item) => item.originalIndex);

      try {
        const result = await reorderInterviewQuestions(project.id, newOrder);
        if (!result.success) {
          // Revert on error
          setQuestionItems(questionItems);
          toast.error(result.message || t("questionReorderFailed"));
          return;
        }
        // Don't call router.refresh() to avoid visual jump
        // The state is already updated optimistically
      } catch (error) {
        // Revert on error
        setQuestionItems(questionItems);
        toast.error((error as Error).message || t("questionReorderFailed"));
      }
    },
    [questionItems, project.id, t],
  );

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
  }, [project.id]);

  const handleProjectUpdated = useCallback(() => {
    // Refresh the page to show updated data
    router.refresh();
  }, [router]);

  const handleCreateQuestion = useCallback(() => {
    setEditingQuestionIndex(undefined);
    setEditingQuestion(null);
    setQuestionEditDialogOpen(true);
  }, []);

  const handleEditQuestion = useCallback((index: number, question: QuestionData) => {
    setEditingQuestionIndex(index);
    setEditingQuestion(question);
    setQuestionEditDialogOpen(true);
  }, []);

  const handleSaveQuestion = useCallback(
    async (questionData: QuestionData) => {
      try {
        // If editingQuestionIndex is undefined, create new question
        if (editingQuestionIndex === undefined) {
          const result = await createInterviewQuestion(project.id, questionData);
          if (!result.success) {
            toast.error(result.message || t("questionUpdateFailed"));
            return;
          }
          toast.success(t("questionCreated"));
        } else {
          // Otherwise, update existing question
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
        }
        // Clear dialog state before refresh to prevent flash
        setQuestionEditDialogOpen(false);
        setEditingQuestion(null);
        setEditingQuestionIndex(undefined);
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
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <ListIcon className="h-5 w-5 mr-2" />
                {t("questionList")} ({project.extra?.questions?.length || 0})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t("questionListDescription")}</p>
            </div>
            {!readOnly && project.extra?.questions && project.extra.questions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleCreateQuestion}>
                {t("addQuestion")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questionItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questionItems.map((item, displayIndex) => (
                    <SortableQuestionItem
                      key={item.id}
                      question={item.data}
                      index={displayIndex}
                      sortableId={item.id}
                      onEdit={() =>
                        handleEditQuestion(item.originalIndex, {
                          text: item.data.text,
                          image: item.data.image,
                          questionType: item.data.questionType,
                          hint: item.data.hint,
                          options: item.data.options?.map((opt) =>
                            typeof opt === "string" ? opt : opt.text,
                          ),
                        })
                      }
                      onDelete={() => handleDeleteQuestion(item.originalIndex)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
