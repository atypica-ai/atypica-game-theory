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

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: MemoryData;
  onMemoryUpdated: () => void;
}

export function MemoryDialog({ open, onOpenChange, memory, onMemoryUpdated }: MemoryDialogProps) {
  const t = useTranslations("AccountPage.capabilities.memory");
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
    } else {
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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
              <br />
              {t("lastUpdated")}: {formatDate(memory.updatedAt, locale)}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("memoryContent")}</div>
            <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
              {memory.core || t("noMemoryContent")}
            </div>
          </div>
        </div>

        {/* Edit Button or Floating Input Box */}
        <div className="px-6 pb-6 relative">
          {!isEditing ? (
            <Button
              onClick={handleEditClick}
              variant="outline"
              className="rounded-full h-10 w-10 p-0"
              size="icon"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-background border rounded-full px-4 py-2 shadow-sm">
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("editPlaceholder")}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent flex-1"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full shrink-0"
                  disabled={isSubmitting || !editValue.trim()}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
