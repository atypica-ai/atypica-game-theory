"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { EditIcon, SaveIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { saveTeamMemoryAction } from "./actions";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: MemoryData;
  onMemoryUpdated: (updated: MemoryData) => void;
}

export function TeamMemoryDialog({
  open,
  onOpenChange,
  memory,
  onMemoryUpdated,
}: TeamMemoryDialogProps) {
  const t = useTranslations("Team.Capabilities.memory");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.core);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(memory.core);
  };

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error(t("saveError"));
      return;
    }

    setIsSubmitting(true);
    const result = await saveTeamMemoryAction({
      content: editContent,
    });

    if (result.success && result.data) {
      toast.success(t("saveSuccess"));
      setIsEditing(false);
      onMemoryUpdated({
        core: result.data.core,
        version: result.data.version,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      });
    } else if (!result.success) {
      toast.error(t("saveError"), {
        description: result.message,
      });
    }
    setIsSubmitting(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setIsEditing(false);
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("dialogDescription")} — {t("lastUpdated")}: {formatDate(memory.updatedAt, locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {isEditing ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <Label className="shrink-0 text-sm font-medium">{t("memoryContent")}</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 resize-none font-mono text-sm"
                  placeholder={t("editPlaceholder")}
                />
              </div>
              <div className="shrink-0 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting || editContent === memory.core}
                >
                  <SaveIcon className="h-4 w-4" />
                  {isSubmitting ? t("savingButton") : t("saveButton")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="shrink-0 text-sm font-medium">{t("memoryContent")}</div>
                <div className="flex-1 min-h-0 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap overflow-y-auto">
                  {memory.core || t("noMemoryContent")}
                </div>
              </div>
              <div className="shrink-0">
                <Button onClick={handleEditClick} variant="outline" size="icon" className="h-10 w-10">
                  <EditIcon className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
