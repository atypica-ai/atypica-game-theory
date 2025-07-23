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
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validationResult = createInterviewProjectSchema.safeParse({ brief: brief.trim() });
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.map((err) => err.message);
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const result = await createInterviewProject({ brief: brief.trim() });

      if (result.success) {
        toast.success("Interview project created successfully");
        setBrief("");
        onOpenChange(false);
        onProjectCreated();
      } else {
        toast.error(result.message || "Failed to create project");
        if (result.message) {
          setErrors([result.message]);
        }
      }
    } catch (error) {
      toast.error("Failed to create project");
      setErrors(["An unexpected error occurred"]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      if (!newOpen) {
        setBrief("");
        setErrors([]);
      }
      onOpenChange(newOpen);
    }
  };

  const characterCount = brief.length;
  const maxLength = 2000;
  const isOverLimit = characterCount > maxLength;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Interview Project</DialogTitle>
            <DialogDescription>
              Describe your research goals and the topics you want to explore in interviews. This
              will help guide the conversation during interviews.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brief">Project Brief</Label>
              <Textarea
                id="brief"
                placeholder="Describe your research objectives, target audience, key questions to explore, and any specific topics you want to focus on during the interviews..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={loading}
              />
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
                  {characterCount}/{maxLength}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Tips for writing a good brief:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Clearly state your research objectives</li>
                <li>• Describe your target audience or user group</li>
                <li>• List key topics or areas you want to explore</li>
                <li>• Include any specific questions you want answered</li>
                <li>• Mention any constraints or context that's important</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !brief.trim() || isOverLimit}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
