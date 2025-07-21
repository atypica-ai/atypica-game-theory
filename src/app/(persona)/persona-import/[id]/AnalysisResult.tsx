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
    if (score >= 2) return "text-yellow-600";
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
        return <UsersIcon className="size-5" />;
      case "Psychological":
        return <BrainIcon className="size-5" />;
      case "BehavioralEconomics":
        return <TargetIcon className="size-5" />;
      case "PoliticalCognition":
        return <ScaleIcon className="size-5" />;
      default:
        return <FileTextIcon className="size-5" />;
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
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <BarChart3Icon className="size-4 text-white" />
          </div>
          完整性分析结果
        </h2>
        <p className="text-gray-600 ml-11">
          基于四大社会心理维度的结构化分析与评分，评估信息完备度
        </p>
      </div>
      <div className="space-y-8">
        {/* Radar Chart */}
        <div className="flex justify-center">
          <div className="w-full max-w-lg p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl border border-blue-100/50">
            <div className="h-80 w-full relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl" />
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <PolarGrid
                    gridType="polygon"
                    stroke="#e2e8f0"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: "#64748b",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 3]} tick={false} axisLine={false} />
                  <Radar
                    name="评分"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="url(#radarGradient)"
                    fillOpacity={0.25}
                    strokeWidth={1.5}
                    filter="url(#glow)"
                    dot={{ fill: "#3b82f6", strokeWidth: 1, r: 4 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                      padding: "12px 16px",
                    }}
                    labelStyle={{
                      color: "#1e293b",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                    itemStyle={{
                      color: "#3b82f6",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">整体分析评分</h3>
                <Badge variant="outline" className="text-lg px-4 py-2 bg-white/70">
                  {analysis.totalScore ?? 0} / 12
                </Badge>
              </div>
              <div className="w-full bg-white/70 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${((analysis.totalScore ?? 0) / 12) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
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
          <div className="space-y-4">
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
                <div
                  key={dimension}
                  className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200/50"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                          {getDimensionIcon(dimension)}
                        </div>
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {getDimensionName(dimension)}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-bold ${getScoreColor(dimensionData.score ?? 0)}`}
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
                          className={
                            (dimensionData.score ?? 0) === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-white/70"
                          }
                        >
                          {getScoreLabel(dimensionData.score ?? 0)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{dimensionData.reason}</p>
                    {dimensionData.questions && dimensionData.questions.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <h5 className="font-medium text-sm mb-2 text-gray-700">针对性补充问题</h5>
                        <div className="space-y-1.5">
                          {dimensionData.questions.map((question, index) => (
                            <div
                              key={index}
                              className="text-xs p-2 bg-white/70 rounded-md border-l-2 border-blue-400"
                            >
                              <span className="font-medium text-blue-600">Q{index + 1}:</span>{" "}
                              <span className="text-gray-700">{question}</span>
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
