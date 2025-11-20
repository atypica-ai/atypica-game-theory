import { updateInterviewProject } from "@/app/(interviewProject)/actions";
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
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => void;
  projectId: number;
  initialBrief: string;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  onProjectUpdated,
  projectId,
  initialBrief,
}: EditProjectDialogProps) {
  const t = useTranslations("InterviewProject.createProjectDialog");
  const [brief, setBrief] = useState(initialBrief);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      setBrief(initialBrief);
      setErrors([]);
    }
  }, [open, initialBrief]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrors([]);

    try {
      const result = await updateInterviewProject(projectId, {
        brief: brief.trim(),
      });
      if (!result.success) {
        toast.error(result.message || t("error"));
        setErrors([result.message || t("error")]);
        return;
      }
      toast.success(t("updateSuccess"));
      onOpenChange(false);
      onProjectUpdated();
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
      onOpenChange(newOpen);
    }
  };

  const maxLength = 2000;
  const isOverLimit = brief.length > maxLength;
  const isFormValid = brief.trim() && !isOverLimit;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-sm:p-4 sm:max-w-2xl max-h-[90vh]  overflow-y-scroll">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
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
                {brief.length}/{maxLength} {t("maxCharacters")}
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
              {loading ? t("updating") : t("update")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
