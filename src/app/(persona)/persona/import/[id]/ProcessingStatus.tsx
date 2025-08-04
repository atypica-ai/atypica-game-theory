"use client";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { Persona } from "@/prisma/client";
import {
  ActivityIcon,
  AlertCircleIcon,
  BarChart3Icon,
  BotIcon,
  CheckCircleIcon,
  Loader2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ProcessingStatusProps {
  isGenerating: boolean;
  isAnalyzing: boolean;
  personas?: Persona[];
  personaImportAnalysis?: Partial<PersonaImportAnalysis> | null;
}

export function ProcessingStatus({
  isGenerating,
  isAnalyzing,
  personas,
  personaImportAnalysis,
}: ProcessingStatusProps) {
  const t = useTranslations("PersonaImport.import");
  // Extract analysis data from personaImportAnalysis
  const analysis = personaImportAnalysis?.analysis;
  const supplementaryQuestions = personaImportAnalysis?.supplementaryQuestions;

  // Determine actual completion status
  const personaAgentCompleted = Boolean(personas?.length);
  const analysisCompleted = Boolean(analysis && supplementaryQuestions);

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <ActivityIcon className="size-3" />
            </div>
            {t("progress")}
          </h2>
          <p className="text-muted-foreground ml-9 text-sm">{t("progressDescription")}</p>
        </div>

        <div className="space-y-4">
          {/* 人格画像生成状态 */}
          <div className="p-4 bg-background rounded-lg border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <BotIcon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{t("personaGeneration")}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isGenerating ? (
                    <Loader2Icon className="size-4 text-muted-foreground animate-spin" />
                  ) : personaAgentCompleted ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : (
                    <AlertCircleIcon className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isGenerating
                      ? t("generating")
                      : personaAgentCompleted
                        ? t("completed")
                        : t("waiting")}
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{
                    width: `${isGenerating ? 50 : personaAgentCompleted ? 100 : 0}%`,
                  }}
                />
              </div>
              {isGenerating && (
                <div className="text-xs text-foreground bg-muted px-3 py-1 rounded inline-block">
                  {t("generatingPersona")}
                </div>
              )}
            </div>
          </div>

          {/* 分析状态 */}
          <div className="p-4 bg-background rounded-lg border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <BarChart3Icon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{t("completenessAnalysis")}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isAnalyzing ? (
                    <Loader2Icon className="size-4 text-muted-foreground animate-spin" />
                  ) : analysisCompleted ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : (
                    <AlertCircleIcon className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isAnalyzing
                      ? t("analyzing")
                      : analysisCompleted
                        ? t("completed")
                        : t("waiting")}
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{
                    width: `${isAnalyzing ? 50 : analysisCompleted ? 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisCompleted && (
                  <div className="text-xs text-foreground bg-muted px-3 py-1 rounded flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {t("dimensionAnalysisComplete")}
                    {Math.round(((analysis?.totalScore ?? 0) / (7 * 3)) * 100)}%
                  </div>
                )}
                {supplementaryQuestions && (
                  <div className="text-xs text-foreground bg-muted px-3 py-1 rounded flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {t("supplementaryQuestionsGenerated")}{" "}
                    {supplementaryQuestions.questions?.length ?? 0} {t("supplementaryQuestions")}
                  </div>
                )}
              </div>
              {isAnalyzing && (
                <div className="text-xs text-foreground bg-muted px-3 py-1 rounded inline-block">
                  {t("analyzingCompleteness")}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 显示生成的人格画像 */}
        {personas && personas.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">{t("generatedPersonas")}</h3>
            <div className="grid gap-3">
              {personas.map((persona) => (
                <div key={persona.id} className="p-3 bg-muted rounded border">
                  <div className="font-medium">{persona.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{persona.source}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
