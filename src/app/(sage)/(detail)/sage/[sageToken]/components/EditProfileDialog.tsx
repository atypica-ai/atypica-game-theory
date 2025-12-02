"use client";

import { updateSageProfileAction } from "@/app/(sage)/(detail)/actions";
import type { SageWithTypedFields } from "@/app/(sage)/(detail)/hooks/SageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function EditProfileDialog({
  sage,
  open,
  onOpenChange,
}: {
  sage: SageWithTypedFields;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Sage.EditProfileDialog");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: sage.name,
    domain: sage.domain,
    bio: sage.bio || "",
    expertise: sage.expertise || [],
    locale: sage.locale as "zh-CN" | "en-US",
  });
  const [newExpertise, setNewExpertise] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddExpertise = useCallback(() => {
    if (newExpertise.trim()) {
      setFormData((prev) => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()],
      }));
      setNewExpertise("");
    }
  }, [newExpertise]);

  const handleRemoveExpertise = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await updateSageProfileAction(sage.id, formData);
      if (!result.success) throw result;
      toast.success(t("profileUpdated"));
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(t("updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [sage.id, formData, router, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("editProfileTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("name")}
            />
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">{t("domain")}</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData((prev) => ({ ...prev, domain: e.target.value }))}
              placeholder={t("domain")}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">{t("bioLabel")}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder={t("bioLabel")}
              rows={3}
            />
          </div>

          {/* Expertise */}
          <div className="space-y-2">
            <Label>{t("expertiseLabel")}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.expertise.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                >
                  <span>{exp}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpertise(idx)}
                    className="hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                placeholder={t("addExpertise")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExpertise();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddExpertise}>
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Locale */}
          <div className="space-y-2">
            <Label htmlFor="locale">{t("locale")}</Label>
            <Select
              value={formData.locale}
              onValueChange={(value: "zh-CN" | "en-US") =>
                setFormData((prev) => ({ ...prev, locale: value }))
              }
            >
              <SelectTrigger id="locale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
                <SelectItem value="en-US">English (en-US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
