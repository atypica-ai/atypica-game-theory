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
  // Extract analysis data from personaImportAnalysis
  const analysis = personaImportAnalysis?.analysis;
  const supplementaryQuestions = personaImportAnalysis?.supplementaryQuestions;

  // Determine actual completion status
  const personaAgentCompleted = Boolean(personas?.length);
  const analysisCompleted = Boolean(analysis && supplementaryQuestions);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
              <ActivityIcon className="size-3 text-white" />
            </div>
            处理进度
          </h2>
          <p className="text-slate-600 ml-9 text-sm">AI 正在分析您的访谈内容并生成人格画像</p>
        </div>

        <div className="space-y-4">
          {/* 人格画像生成状态 */}
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                    <BotIcon className="size-4 text-slate-600" />
                  </div>
                  <span className="font-medium text-slate-900">人格画像生成</span>
                </div>
                <div className="flex items-center gap-3">
                  {isGenerating ? (
                    <Loader2Icon className="size-4 text-slate-600 animate-spin" />
                  ) : personaAgentCompleted ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : (
                    <AlertCircleIcon className="size-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">
                    {isGenerating ? "生成中..." : personaAgentCompleted ? "已完成" : "等待中"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-full bg-slate-900 transition-all duration-500 rounded-full"
                  style={{
                    width: `${isGenerating ? 50 : personaAgentCompleted ? 100 : 0}%`,
                  }}
                />
              </div>
              {isGenerating && (
                <div className="text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded inline-block">
                  正在生成人格画像...
                </div>
              )}
            </div>
          </div>

          {/* 分析状态 */}
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                    <BarChart3Icon className="size-4 text-slate-600" />
                  </div>
                  <span className="font-medium text-slate-900">完整性分析</span>
                </div>
                <div className="flex items-center gap-3">
                  {isAnalyzing ? (
                    <Loader2Icon className="size-4 text-slate-600 animate-spin" />
                  ) : analysisCompleted ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : (
                    <AlertCircleIcon className="size-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">
                    {isAnalyzing ? "分析中..." : analysisCompleted ? "已完成" : "等待中"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-full bg-slate-900 transition-all duration-500 rounded-full"
                  style={{
                    width: `${isAnalyzing ? 50 : analysisCompleted ? 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisCompleted && (
                  <div className="text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    维度分析完成，完整度：
                    {Math.round(((analysis?.totalScore ?? 0) / (7 * 3)) * 100)}%
                  </div>
                )}
                {supplementaryQuestions && (
                  <div className="text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    已生成 {supplementaryQuestions.questions?.length ?? 0} 个补充问题
                  </div>
                )}
              </div>
              {isAnalyzing && (
                <div className="text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded inline-block">
                  正在分析访谈完整性...
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 显示生成的人格画像 */}
        {personas && personas.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">生成的人格画像</h3>
            <div className="grid gap-3">
              {personas.map((persona) => (
                <div key={persona.id} className="p-3 bg-slate-50 rounded border">
                  <div className="font-medium text-slate-900">{persona.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{persona.source}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
