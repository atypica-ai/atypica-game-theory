"use client";
import type { AnalysisResult as AnalysisResultType } from "@/app/(persona)/types";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircleIcon,
  BarChart3Icon,
  BrainIcon,
  FileTextIcon,
  MapPinIcon,
  SmartphoneIcon,
  TargetIcon,
  Users2Icon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AnalysisResultProps {
  analysis: AnalysisResultType["analysis"] | undefined;
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const t = useTranslations("PersonaImport.analysisResult");
  const getScoreColor = (score: number) => {
    if (score >= 3) return "text-green-600";
    if (score >= 2) return "text-blue-600";
    if (score >= 1) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 3) return t("excellent");
    if (score >= 2) return t("good");
    if (score >= 1) return t("basic");
    return t("insufficient");
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case "demographic":
        return <UsersIcon className="size-4" />;
      case "geographic":
        return <MapPinIcon className="size-4" />;
      case "psychological":
        return <BrainIcon className="size-4" />;
      case "behavioral":
        return <TargetIcon className="size-4" />;
      case "needsPainPoints":
        return <AlertCircleIcon className="size-4" />;
      case "techAcceptance":
        return <SmartphoneIcon className="size-4" />;
      case "socialRelations":
        return <Users2Icon className="size-4" />;
      default:
        return <FileTextIcon className="size-4" />;
    }
  };

  const getDimensionName = (dimension: string) => {
    switch (dimension) {
      case "demographic":
        return t("demographics");
      case "geographic":
        return t("geographic");
      case "psychological":
        return t("psychological");
      case "behavioral":
        return t("behavioral");
      case "needsPainPoints":
        return t("needsPainPoints");
      case "techAcceptance":
        return t("techAcceptance");
      case "socialRelations":
        return t("socialRelations");
      default:
        return dimension;
    }
  };

  const radarData = useMemo(() => {
    if (!analysis) return [];
    return [
      { subject: t("demographics"), score: analysis.demographic?.score ?? 0, fullMark: 3 },
      { subject: t("geographic"), score: analysis.geographic?.score ?? 0, fullMark: 3 },
      { subject: t("psychological"), score: analysis.psychological?.score ?? 0, fullMark: 3 },
      { subject: t("behavioral"), score: analysis.behavioral?.score ?? 0, fullMark: 3 },
      { subject: t("needsPainPoints"), score: analysis.needsPainPoints?.score ?? 0, fullMark: 3 },
      { subject: t("techAcceptance"), score: analysis.techAcceptance?.score ?? 0, fullMark: 3 },
      { subject: t("socialRelations"), score: analysis.socialRelations?.score ?? 0, fullMark: 3 },
    ];
  }, [analysis, t]);

  // Calculate percentage score
  const totalScore = analysis?.totalScore ?? 0;
  const maxScore = 21; // 7 dimensions × 3 points each
  const percentageScore = Math.round((totalScore / maxScore) * 100);
  const baselinePercentage = 50;

  if (!analysis) return null;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/20">
      <div className="space-y-6">
        <h2 className="text-lg font-medium flex items-center gap-2 text-card-foreground">
          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center">
            <BarChart3Icon className="size-3 text-primary-foreground" />
          </div>
          {t("title")}
        </h2>

        <div className="space-y-6">
          {/* Radar Chart */}
          <div className="flex justify-center">
            <div className="w-full p-6 bg-white rounded-lg">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid gridType="polygon" stroke="#e2e8f0" strokeWidth={1} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{
                        fill: "#64748b",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 3]} tick={false} axisLine={false} />
                    <Radar
                      name={t("score")}
                      dataKey="score"
                      stroke="#1e293b"
                      fill="#1e293b"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={{ fill: "#1e293b", strokeWidth: 0, r: 3 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1e293b",
                        fontWeight: "500",
                        fontSize: "12px",
                      }}
                      itemStyle={{
                        color: "#1e293b",
                        fontWeight: "500",
                        fontSize: "12px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="p-4 bg-card rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{t("personaCompleteness")}</h3>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {percentageScore}%
                </Badge>
              </div>
              <div className="relative w-full bg-muted rounded-full h-3">
                {/* Baseline indicator */}
                <div
                  className="absolute top-0 w-0.5 h-3 bg-red-400 z-10"
                  style={{ left: `${baselinePercentage}%` }}
                />
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 relative"
                  style={{ width: `${percentageScore}%` }}
                >
                  {/* Score indicator */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-foreground rounded-full" />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {percentageScore >= 80
                    ? t("excellentCoverage")
                    : percentageScore >= 65
                      ? t("goodCoverage")
                      : percentageScore >= baselinePercentage
                        ? t("baselineCoverage")
                        : t("belowBaseline")}
                </span>
                <span className="text-red-500 text-xs flex items-center gap-1">
                  <div className="w-1 h-1 bg-red-400 rounded-full" />
                  {t("baseline")} {baselinePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Dimension Scores */}
          <div className="space-y-3">
            {Object.entries(analysis).map(([dimension, data]) => {
              if (dimension === "totalScore") return null;
              const dimensionData = data as {
                score?: number;
                reason?: string;
                questions?: string[];
              };

              // Skip if no data yet (streaming in progress)
              if (!dimensionData || typeof dimensionData.score === "undefined") {
                return null;
              }
              return (
                <div key={dimension} className="p-4 bg-card rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                          {getDimensionIcon(dimension)}
                        </div>
                        <h4 className="font-medium text-card-foreground text-sm">
                          {getDimensionName(dimension)}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${getScoreColor(dimensionData.score ?? 0)}`}
                        >
                          {dimensionData.score ?? 0}/3
                        </span>
                        <Badge
                          variant={
                            (dimensionData.score ?? 0) >= 3
                              ? "default"
                              : (dimensionData.score ?? 0) === 2
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {getScoreLabel(dimensionData.score ?? 0)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{dimensionData.reason}</p>
                    {dimensionData.questions && dimensionData.questions.length > 0 && (
                      <div className="pt-3 border-t">
                        <h5 className="font-medium text-xs mb-2 text-foreground">
                          {t("targetedQuestions")}
                        </h5>
                        <div className="space-y-2">
                          {dimensionData.questions.map((question, index) => (
                            <div
                              key={index}
                              className="text-xs p-2 bg-muted rounded border-l-2 border-primary"
                            >
                              <span className="font-medium text-foreground">Q{index + 1}:</span>{" "}
                              <span className="text-muted-foreground">{question}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
