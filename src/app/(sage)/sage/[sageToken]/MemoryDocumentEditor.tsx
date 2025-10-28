"use client";

import { updateSage } from "@/app/(sage)/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function MemoryDocumentEditor({
  sageId,
  initialContent,
}: {
  sageId: number;
  initialContent: string;
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const hasChanges = content !== initialContent;

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSage(sageId, {
        memoryDocument: content,
      });

      if (!result.success) throw result;

      toast.success(t("memoryDocumentSaved"));
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving memory document:", error);
      toast.error(t("memoryDocumentSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Brain className="size-5" />
          {t("memoryDocument")}
        </h3>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
                <Save className="size-4" />
                {isSaving ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {t("edit")}
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[500px] font-mono text-sm resize-none"
            placeholder={t("memoryDocumentPlaceholder")}
          />
          <div className="text-xs text-zinc-500">
            {t("memoryDocumentHelp")}
          </div>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-xs bg-zinc-50 dark:bg-zinc-800 p-4 rounded-md overflow-x-auto">
            {content || t("noMemoryDocument")}
          </pre>
        </div>
      )}
    </div>
  );
}
