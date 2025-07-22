"use client";

import { Badge } from "@/components/ui/badge";
import {
  BarChart3Icon,
  BrainIcon,
  FileTextIcon,
  ScaleIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
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
import type { AnalysisResult as AnalysisResultType } from "../../types";

interface AnalysisResultProps {
  analysis: AnalysisResultType["analysis"] | undefined;
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 3) return "text-green-600";
    if (score >= 2) return "text-blue-600";
    if (score >= 1) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 3) return "优秀";
    if (score >= 2) return "良好";
    if (score >= 1) return "基础";
    return "不足";
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case "Demographic":
        return <UsersIcon className="size-4" />;
      case "Psychological":
        return <BrainIcon className="size-4" />;
      case "BehavioralEconomics":
        return <TargetIcon className="size-4" />;
      case "PoliticalCognition":
        return <ScaleIcon className="size-4" />;
      default:
        return <FileTextIcon className="size-4" />;
    }
  };

  const getDimensionName = (dimension: string) => {
    switch (dimension) {
      case "Demographic":
        return "人口与成长轨迹分析";
      case "Psychological":
        return "心理动因与性格特征分析";
      case "BehavioralEconomics":
        return "消费行为与决策偏好分析";
      case "PoliticalCognition":
        return "文化立场与社群归属分析";
      default:
        return dimension;
    }
  };

  const radarData = useMemo(() => {
    if (!analysis) return [];
    return [
      { subject: "人口背景", score: analysis.demographic?.score ?? 0, fullMark: 3 },
      { subject: "心理特征", score: analysis.psychological?.score ?? 0, fullMark: 3 },
      { subject: "消费行为", score: analysis.behavioralEconomics?.score ?? 0, fullMark: 3 },
      { subject: "文化立场", score: analysis.politicalCognition?.score ?? 0, fullMark: 3 },
    ];
  }, [analysis]);

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
            <BarChart3Icon className="size-3 text-white" />
          </div>
          完整性分析结果
        </h2>
        <p className="text-slate-600 ml-9 text-sm">
          基于四大社会心理维度的结构化分析与评分，评估信息完备度
        </p>
      </div>

      <div className="space-y-6">
        {/* Radar Chart */}
        <div className="flex justify-center">
          <div className="w-full max-w-lg p-6 bg-slate-50 rounded-lg border border-slate-200">
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
                    name="评分"
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
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900">整体分析评分</h3>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {analysis.totalScore ?? 0} / 12
              </Badge>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-500"
                style={{ width: `${((analysis.totalScore ?? 0) / 12) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              {(analysis.totalScore ?? 0) >= 9
                ? "各维度覆盖度优秀，信息全面深入"
                : (analysis.totalScore ?? 0) >= 6
                  ? "覆盖度良好，部分维度可进一步优化"
                  : (analysis.totalScore ?? 0) >= 3
                    ? "覆盖度一般，需要重点补充关键信息"
                    : "覆盖度不足，需要大量补充各维度信息"}
            </p>
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
              <div key={dimension} className="p-4 bg-white rounded-lg border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                        {getDimensionIcon(dimension)}
                      </div>
                      <h4 className="font-medium text-slate-900 text-sm">
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
                  <p className="text-xs text-slate-600">{dimensionData.reason}</p>
                  {dimensionData.questions && dimensionData.questions.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <h5 className="font-medium text-xs mb-2 text-slate-700">针对性补充问题</h5>
                      <div className="space-y-2">
                        {dimensionData.questions.map((question, index) => (
                          <div
                            key={index}
                            className="text-xs p-2 bg-slate-50 rounded border-l-2 border-slate-300"
                          >
                            <span className="font-medium text-slate-900">Q{index + 1}:</span>{" "}
                            <span className="text-slate-600">{question}</span>
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
  );
}
