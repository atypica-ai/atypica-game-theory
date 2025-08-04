"use client";
import { createPersonaImport } from "@/app/(persona)/actions";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { BookOpen, FileText, MessageCircle, Target, Upload, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface PersonaImportClientProps {
  isUploadEnabled: boolean;
}

export default function PersonaImportClient({ isUploadEnabled }: PersonaImportClientProps) {
  const t = useTranslations("PersonaImport.personaImportClient");
  const router = useRouter();
  const { uploadedFiles, handleFileUploaded, clearFiles } = useFileUploadManager();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("uploadFileFirst"));
      return;
    }

    const file = uploadedFiles[0];
    if (!file.mimeType.includes("pdf")) {
      toast.error(t("uploadPDFOnly"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPersonaImport({
        // 确保只有这4个字段被保存
        objectUrl: file.objectUrl,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      });
      if (!result.success) throw result;
      const personaImport = result.data;
      router.push(`/personas/import/${personaImport.id}`);
    } catch (error) {
      console.error("Error creating persona import:", error);
      toast.error(t("createFailed"));
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Upload className="size-5" />
              {t("importInterview")}
            </CardTitle>
            <CardDescription className="text-slate-600">{t("importDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <span>{t("pdfConversion")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="size-4" />
                <span>{t("analysisScoring")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                <span>{t("questionGeneration")}</span>
              </div>
            </div>

            {isUploadEnabled ? (
              uploadedFiles.length === 0 ? (
                <FileUploadButton
                  onFileUploadedAction={handleFileUploaded}
                  existingFiles={uploadedFiles}
                  showLimitsCheck={false}
                  disabled={isCreating}
                />
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-100 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <span className="text-sm font-medium">{uploadedFiles[0].name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearFiles} disabled={isCreating}>
                        {t("reSelectFile")}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleStartAnalysis} disabled={isCreating} className="w-full">
                    {isCreating ? t("creating") : t("startAnalysis")}
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <Button disabled className="w-full" variant="outline">
                  {t("uploadDisabled")}
                </Button>
                <div className="text-xs text-orange-600 font-medium text-center">
                  {t("upgradeToMaxPlan")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <MessageCircle className="size-5" />
              {t("chatWithPersonas")}
            </CardTitle>
            <CardDescription className="text-slate-600">{t("chatDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                <span>{t("naturalConversation")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="size-4" />
                <span>{t("behaviorDriven")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <span>{t("multiDimensional")}</span>
              </div>
            </div>
            {isUploadEnabled ? (
              <Button className="w-full" onClick={() => router.push("/personas")}>
                {t("viewMyPersonas")}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button disabled className="w-full" variant="outline">
                  {t("viewMyPersonas")}
                </Button>
                <div className="text-xs text-orange-600 font-medium text-center">
                  {t("upgradeToMaxPlan")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Card */}
      <Card className="border border-slate-200 opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <BookOpen className="size-5" />
            {t("researchWithPersonas")}
          </CardTitle>
          <CardDescription className="text-slate-600">{t("researchDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="size-4" />
              <span>{t("marketResearch")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span>{t("userTesting")}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <span>{t("behavioralAnalytics")}</span>
            </div>
          </div>
          <Button className="w-full" disabled variant="outline">
            {t("comingSoon")}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Dimensions */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">{t("analysisDimensions")}</CardTitle>
          <CardDescription className="text-slate-600">{t("dimensionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">{t("demographic")}</h4>
              </div>
              <p className="text-sm text-slate-600">{t("demographicDescription")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">{t("psychological")}</h4>
              </div>
              <p className="text-sm text-slate-600">{t("psychologicalDescription")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">{t("behavioralEconomics")}</h4>
              </div>
              <p className="text-sm text-slate-600">{t("behavioralDescription")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">{t("politicalCognition")}</h4>
              </div>
              <p className="text-sm text-slate-600">{t("politicalDescription")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">{t("gettingStarted")}</CardTitle>
          <CardDescription className="text-slate-600">
            {t("gettingStartedDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium text-slate-900">{t("step1")}</h4>
                <p className="text-sm text-slate-600">{t("step1Description")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium text-slate-900">{t("step2")}</h4>
                <p className="text-sm text-slate-600">{t("step2Description")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium text-slate-900">{t("step3")}</h4>
                <p className="text-sm text-slate-600">{t("step3Description")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-300 text-slate-500 text-sm font-medium flex items-center justify-center mt-0.5">
                4
              </div>
              <div>
                <h4 className="font-medium text-slate-500">{t("step4")}</h4>
                <p className="text-sm text-slate-500">{t("step4Description")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
