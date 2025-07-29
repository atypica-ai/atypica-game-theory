import { createInterviewProject } from "@/app/(interviewProject)/actions";
import { createInterviewProjectSchema } from "@/app/(interviewProject)/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const t = useTranslations("InterviewProject.createProjectDialog");
  const [brief, setBrief] = useState("");
  const [questions, setQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine brief and questions
    const combinedBrief =
      brief.trim() + (questions.trim() ? `\n\n## Interview Questions\n\n${questions.trim()}` : "");

    // Validate input
    const validationResult = createInterviewProjectSchema.safeParse({ brief: combinedBrief });
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.map((err) => err.message);
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const result = await createInterviewProject({ brief: combinedBrief });

      if (result.success) {
        toast.success(t("success"));
        setBrief("");
        setQuestions("");
        onOpenChange(false);
        onProjectCreated();
      } else {
        toast.error(result.message || t("error"));
        if (result.message) {
          setErrors([result.message]);
        }
      }
    } catch {
      toast.error(t("error"));
      setErrors([t("error")]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      if (!newOpen) {
        setBrief("");
        setQuestions("");
        setErrors([]);
      }
      onOpenChange(newOpen);
    }
  };

  const totalCharacterCount = brief.length + questions.length;
  const maxLength = 2000;
  const isOverLimit = totalCharacterCount > maxLength;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brief">{t("projectBrief")}</Label>
              <Textarea
                id="brief"
                placeholder={t("briefPlaceholder")}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[100px] resize-none"
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
                className="min-h-[100px] resize-none"
                disabled={loading}
              />
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
              <span className={`${isOverLimit ? "text-red-600" : "text-gray-500"}`}>
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
            <Button type="submit" disabled={loading || !brief.trim() || isOverLimit}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
