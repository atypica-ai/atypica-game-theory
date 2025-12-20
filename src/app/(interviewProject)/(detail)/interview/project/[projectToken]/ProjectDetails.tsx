"use client";
import {
  optimizeInterviewQuestions,
  updateAllInterviewQuestions,
} from "@/app/(interviewProject)/(detail)/actions";
import { InviteDialog } from "@/app/(interviewProject)/(detail)/interview/invite/InviteDialog";
import { createPersonaInterviewSession } from "@/app/(interviewProject)/actions";
import { EditProjectDialog } from "@/app/(interviewProject)/components/EditProjectDialog";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra, InterviewProjectQuestion } from "@/prisma/client";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
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
    questions: InterviewProjectQuestion[];
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
  const [editingQuestion, setEditingQuestion] =
    useState<NonNullable<InterviewProjectQuestion> | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | undefined>();
  const [questionEditDialogOpen, setQuestionEditDialogOpen] = useState(false);

  // Simplified state structure - directly manage questions array
  const [questions, setQuestions] = useState<InterviewProjectQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Track if we're currently saving to avoid sync conflicts
  const isSavingRef = useRef(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync questions from server (only when not actively saving)
  useEffect(() => {
    if (!isSavingRef.current) {
      const serverQuestions = project.questions || [];
      setQuestions(serverQuestions);
    }
  }, [project.questions]);

  // Debounced save function (1.5 seconds)
  const debouncedSave = useDebouncedCallback(
    async (questionsToSave: InterviewProjectQuestion[]) => {
      isSavingRef.current = true;
      setIsSaving(true);
      try {
        const result = await updateAllInterviewQuestions(project.id, questionsToSave);
        if (!result.success) {
          toast.error(result.message || t("saveFailed"));
          // Revert to server state on error
          isSavingRef.current = false;
          router.refresh();
        } else {
          // Success - allow next sync after a short delay
          // This gives router.refresh() time to update props
          setTimeout(() => {
            isSavingRef.current = false;
          }, 100);
        }
      } catch (error) {
        toast.error((error as Error).message || t("saveFailed"));
        isSavingRef.current = false;
        router.refresh();
      } finally {
        setIsSaving(false);
      }
    },
    1500, // 1.5 second debounce
  );

  // Polling mechanism - refresh every 10 seconds during processing
  useEffect(() => {
    if (!project.extra?.processing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [project.extra?.processing, router]);

  // Handle drag end - optimistic update with debounced save
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      setQuestions((prev) => {
        const oldIndex = prev.findIndex((_, i) => `question-${i}` === active.id);
        const newIndex = prev.findIndex((_, i) => `question-${i}` === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }

        const newQuestions = arrayMove(prev, oldIndex, newIndex);

        // Trigger debounced save
        debouncedSave(newQuestions);

        return newQuestions;
      });
    },
    [debouncedSave],
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

  const handleEditQuestion = useCallback((index: number) => {
    // Read from current state to avoid dependency on questions array
    setQuestions((currentQuestions) => {
      setEditingQuestionIndex(index);
      setEditingQuestion(currentQuestions[index]);
      setQuestionEditDialogOpen(true);
      return currentQuestions; // No change to questions
    });
  }, []);

  const handleSaveQuestion = useCallback(
    (questionData: InterviewProjectQuestion) => {
      setQuestions((prev) => {
        const newQuestions = [...prev];
        if (editingQuestionIndex !== undefined) {
          // Update existing question
          newQuestions[editingQuestionIndex] = questionData;
        } else {
          // Add new question
          newQuestions.push(questionData);
        }

        // Trigger debounced save
        debouncedSave(newQuestions);

        return newQuestions;
      });

      // Clear dialog state
      setQuestionEditDialogOpen(false);
      setEditingQuestion(null);
      setEditingQuestionIndex(undefined);
    },
    [editingQuestionIndex, debouncedSave],
  );

  const handleDeleteQuestion = useCallback(
    (index: number) => {
      setQuestions((prev) => {
        const newQuestions = prev.filter((_, i) => i !== index);

        // Trigger debounced save
        debouncedSave(newQuestions);

        return newQuestions;
      });
    },
    [debouncedSave],
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
              <CardTitle className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <ListIcon className="h-5 w-5 mr-2" />
                  {t("questionList")} ({questions.length})
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t("questionListDescription")}</p>
            </div>
            {isSaving ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                {t("saving")}
              </div>
            ) : !readOnly && questions.length > 0 ? (
              <Button variant="outline" size="sm" onClick={handleCreateQuestion}>
                {t("addQuestion")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
          {project.extra?.processing ? (
            // Generating state
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm">{t("optimizing")}</p>
            </div>
          ) : questions.length === 0 ? (
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
                items={questions.map((_, index) => `question-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <SortableQuestionItem
                      key={question.text || `question-${index}`}
                      question={question}
                      index={index}
                      sortableId={`question-${index}`}
                      onEdit={() => handleEditQuestion(index)}
                      onDelete={() => handleDeleteQuestion(index)}
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
