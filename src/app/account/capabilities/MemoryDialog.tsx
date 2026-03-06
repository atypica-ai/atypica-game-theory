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
import { formatDate } from "@/lib/utils";
import { ArrowRightIcon, EditIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { requestMemoryUpdate } from "./actions";

interface WorkingMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  working: string[];
  updatedAt: Date;
  onMemoryUpdated: () => void;
}

export function MemoryDialog({
  open,
  onOpenChange,
  working,
  updatedAt,
  onMemoryUpdated,
}: WorkingMemoryDialogProps) {
  const t = useTranslations("AccountPage.capabilities.memory.working");
  const tLastUpdated = useTranslations("AccountPage.capabilities.memory");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!editValue.trim()) {
      toast.error(t("emptyRequest"));
      return;
    }

    setIsSubmitting(true);
    const result = await requestMemoryUpdate(editValue.trim());

    if (result.success) {
      toast.success(t("updateSuccess"));
      setIsEditing(false);
      setEditValue("");
      onMemoryUpdated();
    } else if (!result.success) {
      toast.error(t("updateError"), {
        description: result.message,
      });
    }
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("dialogDescription")} — {tLastUpdated("lastUpdated")}:{" "}
            {formatDate(updatedAt, locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("memoryContent")}</div>
            <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
              {working.join("\n") || t("noMemoryContent")}
            </div>
          </div>

          {!isEditing ? (
            <Button onClick={handleEditClick} variant="outline" size="icon" className="h-10 w-10">
              <EditIcon className="h-4 w-4" />
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("editPlaceholder")}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="shrink-0"
                disabled={isSubmitting || !editValue.trim()}
              >
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
