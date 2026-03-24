"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updatePersonaPanelTitle } from "./actions";

const TITLE_MAX = 255;

export function EditPanelTitleDialog({
  open,
  onOpenChange,
  panelId,
  initialTitle,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: number;
  initialTitle: string;
  onSaved: () => void;
}) {
  const t = useTranslations("PersonaPanel.ListPage");
  const [value, setValue] = useState(initialTitle);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialTitle);
    }
  }, [open, initialTitle]);

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updatePersonaPanelTitle(panelId, value);
      if (!result.success) {
        toast.error(t("renameFailed"));
        return;
      }
      toast.success(t("renameSuccess"));
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error(t("renameFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editPanelTitle")}</DialogTitle>
            <DialogDescription>{t("editPanelTitleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor={`panel-title-${panelId}`}>{t("panelTitleLabel")}</Label>
            <Input
              id={`panel-title-${panelId}`}
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              disabled={loading}
              autoFocus
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {value.length}/{TITLE_MAX}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
