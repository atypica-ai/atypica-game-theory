"use client";

import { AnalysisResult, PersonaImportAnalysis } from "@/app/(persona)/types";
import { Persona } from "@/prisma/client";
import {
  ActivityIcon,
  AlertCircleIcon,
  BarChart3Icon,
  BotIcon,
  CheckCircleIcon,
  Loader2Icon,
} from "lucide-react";

interface ProcessingStatusProps {
  isProcessing: boolean;
  isAnalyzing: boolean;
  analysis: AnalysisResult["analysis"] | undefined;
  supplementaryQuestions: AnalysisResult["supplementaryQuestions"] | undefined;
  personas?: Persona[];
  personaImportAnalysis?: Partial<PersonaImportAnalysis> | null;
}

export function ProcessingStatus({
  isProcessing,
  isAnalyzing,
  analysis,
  supplementaryQuestions,
  personas,
  personaImportAnalysis,
}: ProcessingStatusProps) {
  // Determine actual completion status
  const personaAgentCompleted = Boolean(personas?.length);
  const analysisCompleted = Boolean(personaImportAnalysis);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
            <ActivityIcon className="size-4 text-white" />
          </div>
          处理进度
        </h2>
        <p className="text-gray-600 ml-11">并行处理PDF文件：生成人格画像总结和完整性分析</p>
      </div>
      <div className="space-y-6">
        {/* 人格画像生成状态 */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <BotIcon className="size-5 text-white" />
                </div>
                <span className="font-semibold text-gray-800">人格画像生成</span>
              </div>
              <div className="flex items-center gap-3">
                {isProcessing ? (
                  <Loader2Icon className="size-5 animate-spin text-blue-600" />
                ) : personaAgentCompleted ? (
                  <CheckCircleIcon className="size-5 text-green-600" />
                ) : (
                  <AlertCircleIcon className="size-5 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {isProcessing ? "生成中..." : personaAgentCompleted ? "已完成" : "等待中"}
                </span>
              </div>
            </div>
            <div className="w-full bg-white/70 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 rounded-full"
                style={{
                  width: `${isProcessing ? 50 : personaAgentCompleted ? 100 : 0}%`,
                }}
              />
            </div>
            {isProcessing && (
              <div className="text-xs text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full inline-block">
                正在生成人格画像...
              </div>
            )}
          </div>
        </div>

        {/* 分析状态 */}
        <div className="p-5 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl border border-purple-200/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center">
                  <BarChart3Icon className="size-5 text-white" />
                </div>
                <span className="font-semibold text-gray-800">完整性分析</span>
              </div>
              <div className="flex items-center gap-3">
                {isAnalyzing ? (
                  <Loader2Icon className="size-5 animate-spin text-purple-600" />
                ) : analysisCompleted ? (
                  <CheckCircleIcon className="size-5 text-green-600" />
                ) : (
                  <AlertCircleIcon className="size-5 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {isAnalyzing ? "分析中..." : analysisCompleted ? "已完成" : "等待中"}
                </span>
              </div>
            </div>
            <div className="w-full bg-white/70 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-600 transition-all duration-500 rounded-full"
                style={{ width: `${isAnalyzing ? 50 : analysisCompleted ? 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisCompleted && (
                <div className="text-xs text-purple-700 bg-purple-100/50 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  维度分析完成，总分：
                  {(personaImportAnalysis?.analysis || analysis)?.totalScore ?? 0}/12
                </div>
              )}
              {supplementaryQuestions && (
                <div className="text-xs text-cyan-700 bg-cyan-100/50 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  已生成 {supplementaryQuestions.questions?.length ?? 0} 个补充问题
                </div>
              )}
            </div>
          </div>
        </div>

        {!isProcessing && !isAnalyzing && personaAgentCompleted && analysisCompleted && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200/50">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">处理完成！</p>
                <p className="text-sm text-green-700">
                  人格画像总结和完整性分析都已完成。请查看下方结果。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
