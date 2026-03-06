"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { EditIcon, SaveIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { saveUserCoreMemory } from "./actions";

export function CoreMemoryDialog({
  open,
  onOpenChange,
  memory,
  onMemoryUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: {
    core: string;
    updatedAt: Date | null;
  };
  onMemoryUpdated: (updated: {
    core: string;
    working: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) => void;
}) {
  const t = useTranslations("AccountPage.capabilities.memory.core");
  const tLastUpdated = useTranslations("AccountPage.capabilities.memory");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.core);
  const [changeNotes, setChangeNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(memory.core);
    setChangeNotes("");
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const result = await saveUserCoreMemory(editContent, changeNotes || undefined);

    if (result.success && result.data) {
      toast.success(t("saveSuccess"));
      setIsEditing(false);
      onMemoryUpdated(result.data);
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
      <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("dialogDescription")}
            {memory.updatedAt &&
              ` — ${tLastUpdated("lastUpdated")}: ${formatDate(memory.updatedAt, locale)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("memoryContent")}</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder={t("editPlaceholder")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("changeNoteLabel")}</Label>
                <Input
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder={t("changeNotesPlaceholder")}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting || editContent === memory.core}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {isSubmitting ? t("savingButton") : t("saveButton")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("memoryContent")}</div>
                <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                  {memory.core || t("noMemoryContent")}
                </div>
              </div>
              <Button onClick={handleEditClick} variant="outline" size="icon" className="h-10 w-10">
                <EditIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
