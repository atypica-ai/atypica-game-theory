import { createInterviewProject, updateInterviewProject } from "@/app/(interviewProject)/actions";
import {
  CreateInterviewProjectInput,
  createInterviewProjectSchema,
} from "@/app/(interviewProject)/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: { token: string }) => void;
  onProjectUpdated?: () => void;
  mode: "create" | "edit";
  projectId?: number;
  initialBrief?: string;
  initialQuestionTypePreference?: "open-ended" | "multiple-choice" | "mixed";
}

// Helper function to split brief and questions
function splitBriefAndQuestions(text: string): { brief: string; questions: string } {
  // Look for the "## Interview Questions" section (matches the combine format)
  const questionsSectionMarker = "\n\n## Interview Questions\n\n";
  const questionsSectionIndex = text.indexOf(questionsSectionMarker);

  if (questionsSectionIndex !== -1) {
    const briefPart = text.substring(0, questionsSectionIndex).trim();
    const questionsPart = text
      .substring(questionsSectionIndex + questionsSectionMarker.length)
      .trim();
    return {
      brief: briefPart,
      questions: questionsPart,
    };
  }

  return {
    brief: text.trim(),
    questions: "",
  };
}

export function EditProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  onProjectUpdated,
  mode,
  projectId,
  initialBrief = "",
  initialQuestionTypePreference,
}: EditProjectDialogProps) {
  const t = useTranslations("InterviewProject.createProjectDialog");
  const [brief, setBrief] = useState("");
  const [questions, setQuestions] = useState("");
  const [questionTypePreference, setQuestionTypePreference] =
    useState<CreateInterviewProjectInput["questionTypePreference"]>("open-ended");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form data when dialog opens or mode changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialBrief) {
        const { brief: splitBrief, questions: splitQuestions } =
          splitBriefAndQuestions(initialBrief);
        setBrief(splitBrief);
        setQuestions(splitQuestions);
        setQuestionTypePreference(initialQuestionTypePreference || "open-ended");
      } else {
        setBrief("");
        setQuestions("");
        setQuestionTypePreference("open-ended");
      }
      setErrors([]);
    }
  }, [open, mode, initialBrief, initialQuestionTypePreference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine brief and questions
    const combinedBrief =
      brief.trim() + (questions.trim() ? `\n\n## Interview Questions\n\n${questions.trim()}` : "");

    // Validate input
    const validationResult = createInterviewProjectSchema.safeParse({
      brief: combinedBrief,
      questionTypePreference,
    });
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.map((err) => err.message);
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      if (mode === "create") {
        const result = await createInterviewProject({
          brief: combinedBrief,
          questionTypePreference,
        });
        if (!result.success) throw result;
        toast.success(t("success"));
        setBrief("");
        setQuestions("");
        setQuestionTypePreference("open-ended");
        onOpenChange(false);
        onProjectCreated?.({ token: result.data.token });
      } else if (mode === "edit" && projectId) {
        const result = await updateInterviewProject(projectId, {
          brief: combinedBrief,
          questionTypePreference,
        });
        if (!result.success) throw result;
        toast.success(t("updateSuccess"));
        onOpenChange(false);
        onProjectUpdated?.();
      }
    } catch (error) {
      const errorMessage = (error as Error).message || t("error");
      toast.error(errorMessage);
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      if (!newOpen) {
        setBrief("");
        setQuestions("");
        setQuestionTypePreference("open-ended");
        setErrors([]);
      }
      onOpenChange(newOpen);
    }
  };

  const totalCharacterCount = brief.length + questions.length;
  const maxLength = 2000;
  const isOverLimit = totalCharacterCount > maxLength;
  const isFormValid = brief.trim() && !isOverLimit;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-sm:p-4 sm:max-w-2xl max-h-[90vh]  overflow-y-scroll">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? t("title") : t("editTitle")}</DialogTitle>
            <DialogDescription>
              {mode === "create" ? t("description") : t("editDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brief">{t("projectBrief")}</Label>
              <Textarea
                id="brief"
                placeholder={t("briefPlaceholder")}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="h-40 resize-none"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questions">{t("predefinedQuestions")}</Label>
              <Textarea
                id="questions"
                placeholder={t("questionsPlaceholder")}
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                className="h-40 resize-none"
                disabled={loading}
              />
            </div>
            <div className="mt-6 space-y-2">
              <div>
                <Label>{t("questionTypePreference")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("questionTypePreferenceDescription")}
                </p>
              </div>
              <RadioGroup
                value={questionTypePreference}
                onValueChange={(value) =>
                  setQuestionTypePreference(
                    value as CreateInterviewProjectInput["questionTypePreference"],
                  )
                }
                disabled={loading}
                className="flex items-center justify-start gap-2"
              >
                {[
                  { value: "open-ended", labelKey: "questionTypeOpenEnded" as const },
                  { value: "multiple-choice", labelKey: "questionTypeMultipleChoice" as const },
                  { value: "mixed", labelKey: "questionTypeMixed" as const },
                ].map(({ value, labelKey }) => (
                  <div key={value} className="flex items-center gap-2 p-1">
                    <RadioGroupItem
                      className="size-3"
                      value={value}
                      id={`questionTypePreference/${value}`}
                    />
                    <Label
                      htmlFor={`questionTypePreference/${value}`}
                      className="flex-1 cursor-pointer font-medium text-sm tracking-tight"
                    >
                      {t(labelKey)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="space-y-1">
                {errors.length > 0 && (
                  <div className="text-red-600 space-y-1">
                    {errors.map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                )}
              </div>
              <span className={cn(isOverLimit ? "text-red-600" : "text-gray-500")}>
                {totalCharacterCount}/{maxLength} {t("maxCharacters")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading
                ? mode === "create"
                  ? t("creating")
                  : t("updating")
                : mode === "create"
                  ? t("create")
                  : t("update")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
