"use client";

import type { Sage } from "@/prisma/client";
import type { SageExtra } from "../../../types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };

export function AnalysisTab({ sage }: { sage: SageWithExtra }) {
  const t = useTranslations("Sage.detail");

  const analysis = sage.extra?.knowledgeAnalysis;
  const hasAnalysis = !!analysis?.overallScore;

  if (!hasAnalysis) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("analysisResults")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("noAnalysisYet")}
          </p>
        </div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "low":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("analysisResults")}</h1>
        <p className="text-muted-foreground">{sage.domain}</p>
      </div>

      <Separator />

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>{t("overallScore")}</CardTitle>
          <CardDescription>
            {t("knowledgeCompletenessScore")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{analysis.overallScore ?? 0}/100</span>
              <Badge variant={(analysis.overallScore ?? 0) >= 80 ? "default" : "secondary"}>
                {(analysis.overallScore ?? 0) >= 80 ? t("excellent") : (analysis.overallScore ?? 0) >= 60 ? t("good") : t("needsImprovement")}
              </Badge>
            </div>
            <Progress value={analysis.overallScore ?? 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Dimensions */}
      {analysis.dimensions && analysis.dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("knowledgeDimensions")}</CardTitle>
            <CardDescription>
              {t("dimensionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.dimensions.map((dimension, idx) => (
              <div key={idx} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{dimension.name}</h3>
                  <Badge className={getLevelColor(dimension.level)}>
                    {dimension.level} ({dimension.score}/100)
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dimension.assessment}</p>
                {dimension.improvementSuggestions && dimension.improvementSuggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t("improvementSuggestions")}:
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      {dimension.improvementSuggestions.map((suggestion, sidx) => (
                        <li key={sidx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Analysis Metadata */}
      {analysis.analyzedAt && (
        <Card>
          <CardHeader>
            <CardTitle>{t("analysisMetadata")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {t("analyzedAt")}: {new Date(analysis.analyzedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
