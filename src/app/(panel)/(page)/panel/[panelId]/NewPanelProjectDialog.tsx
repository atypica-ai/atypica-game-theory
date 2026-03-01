"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Mic, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createUniversalAgentFromPanel, type ResearchType } from "./actions";

interface NewPanelProjectDialogProps {
  panelId: number;
  personas: Array<{ id: number; name: string }>;
  defaultType?: ResearchType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPanelProjectDialog({
  panelId,
  personas,
  defaultType = "focusGroup",
  open,
  onOpenChange,
}: NewPanelProjectDialogProps) {
  const t = useTranslations("PersonaPanel");
  const router = useRouter();

  const [researchType, setResearchType] = useState<ResearchType>(defaultType);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens with a new defaultType
  useEffect(() => {
    if (open) {
      setResearchType(defaultType);
      setQuestion("");
    }
  }, [open, defaultType]);

  const researchTypeOptions = [
    {
      type: "focusGroup" as const,
      icon: Users,
      label: t("DetailPage.projectType.focusGroup"),
    },
    {
      type: "userInterview" as const,
      icon: MessageCircle,
      label: t("DetailPage.projectType.userInterview"),
    },
    {
      type: "expertInterview" as const,
      icon: Mic,
      label: t("DetailPage.projectType.expertInterview"),
    },
  ];

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || submitting) return;

    setSubmitting(true);
    const result = await createUniversalAgentFromPanel(
      panelId,
      researchType,
      question.trim(),
      personas,
    );

    if (result.success) {
      onOpenChange(false);
      router.push(`/panel/project/${result.data.token}`);
    } else {
      toast.error(result.message ?? "Failed to create research");
      setSubmitting(false);
    }
  }, [panelId, researchType, question, personas, submitting, router, onOpenChange]);

  const handleOpenChange = (newOpen: boolean) => {
    if (submitting) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ResearchWizard.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Research Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("ResearchWizard.researchType")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {researchTypeOptions.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setResearchType(type)}
                  disabled={submitting}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                    researchType === type
                      ? "border-foreground/20 bg-accent"
                      : "border-border hover:border-foreground/20",
                    submitting && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Research Question */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("ResearchWizard.question")}
            </label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("ResearchWizard.questionPlaceholder")}
              className="min-h-[100px] text-sm resize-none"
              disabled={submitting}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("ResearchWizard.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || submitting}
            size="sm"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                {t("ListPage.creating")}
              </>
            ) : (
              t("ResearchWizard.start")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
