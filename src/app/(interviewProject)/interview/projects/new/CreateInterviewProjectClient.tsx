"use client";

import { createInterviewProject } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function CreateInterviewProjectClient() {
  const router = useRouter();
  const t = useTranslations("InterviewProject.createProject");

  const [brief, setBrief] = useState("");
  const [presetQuestions, setPresetQuestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit form
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!brief.trim()) {
      toast.error(t("briefRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createInterviewProject({
        brief: brief.trim(),
        presetQuestions: presetQuestions.trim(),
      });

      if (!result.success) {
        toast.error(result.message || t("createFailed"));
        return;
      }

      toast.success(t("createSuccess"));
      router.replace(`/interview/project/${result.data.token}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error(t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [brief, presetQuestions, router, t]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto px-4 sm:px-8 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace("/interview/projects")}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("backToProjects")}
          </Button>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        <div className="space-y-8">
          {/* Project Brief */}
          <Card>
            <CardHeader>
              <Label htmlFor="brief" className="text-base font-semibold">
                {t("projectBrief")}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">{t("projectBriefDescription")}</p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={t("projectBriefPlaceholder")}
                className="min-h-32"
                maxLength={5000}
              />
              <div className="text-xs text-muted-foreground text-right mt-2">
                {brief.length}/5000 {t("characters")}
              </div>
            </CardContent>
          </Card>

          {/* Preset Questions */}
          <Card>
            <CardHeader>
              <Label htmlFor="presetQuestions" className="text-base font-semibold">
                {t("presetQuestions")}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t("presetQuestionsDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="presetQuestions"
                value={presetQuestions}
                onChange={(e) => setPresetQuestions(e.target.value)}
                placeholder={t("presetQuestionsPlaceholder")}
                className="min-h-64"
              />
              <div className="text-xs text-muted-foreground mt-2">{t("presetQuestionsHint")}</div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button variant="outline" onClick={() => router.replace("/interview/projects")}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-32">
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  {t("creating")}
                </>
              ) : (
                t("createProject")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
