"use client";
import { Button } from "@/components/ui/button";
import { BrainIcon, FileTextIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { reAnalyzePersonaImport } from "../../actions";
import { PersonaImportAnalysis } from "../../types";
import { AnalysisResult } from "./AnalysisResult";
import { PersonaSummary } from "./PersonaSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { SupplementaryQuestions } from "./SupplementaryQuestions";

import { ChatMessageAttachment, Persona, PersonaImport, PersonaImportExtra } from "@/prisma/client";

export function PersonaImportView({
  personaImport: initialPersonaImport,
  personas,
}: {
  personaImport: Omit<PersonaImport, "analysis" | "extra"> & {
    analysis: Partial<PersonaImportAnalysis> | null;
    extra: PersonaImportExtra;
  };
  personas: Persona[];
}) {
  const router = useRouter();
  const [personaImport, setPersonaImport] = useState(initialPersonaImport);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);

  // Check if processing is complete
  const isProcessingComplete = Boolean(
    personas.length > 0 &&
      personaImport.analysis?.analysis &&
      personaImport.analysis?.supplementaryQuestions,
  );

  // Check if there's an error
  const hasError = Boolean(personaImport.extra?.error);

  // Check individual completion status
  const personaAgentCompleted = Boolean(personas.length);
  const analysisCompleted = Boolean(
    personaImport.analysis?.analysis && personaImport.analysis?.supplementaryQuestions,
  );

  // Parse analysis data
  const analysis = personaImport.analysis?.analysis;
  const supplementaryQuestions = personaImport.analysis?.supplementaryQuestions;

  // Get file info
  const attachments = personaImport.attachments as ChatMessageAttachment[];
  const fileName = attachments?.[0]?.name || "文件";

  // Polling effect
  useEffect(() => {
    if (isProcessingComplete || hasError) {
      return; // Stop polling if complete or error
    }

    const interval = setInterval(() => {
      router.refresh(); // This will trigger a re-fetch from the server
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isProcessingComplete, hasError, router]);

  // Update local state when props change (from server refresh)
  useEffect(() => {
    setPersonaImport(initialPersonaImport);
  }, [initialPersonaImport]);

  // Show completion message
  useEffect(() => {
    if (isProcessingComplete && !hasError) {
      // Optional: Show success notification when processing completes
      console.log("Processing completed successfully");
    }
  }, [isProcessingComplete, hasError]);

  const handleReAnalyze = async () => {
    if (!confirm("确定要重新分析吗？这将覆盖现有的分析结果。")) {
      return;
    }

    setIsReAnalyzing(true);
    try {
      const result = await reAnalyzePersonaImport(personaImport.id);
      if (!result.success) {
        throw new Error(result.message || "重新分析失败");
      }
      toast.success("重新分析已开始，请稍候...");
      router.refresh();
    } catch (error) {
      console.error("Error re-analyzing:", error);
      toast.error("重新分析失败，请重试");
    } finally {
      setIsReAnalyzing(false);
    }
  };

  const handleViewFile = () => {
    const attachment = attachments[0];
    if (attachment?.objectUrl && attachment?.mimeType) {
      // Use the existing attachment API endpoint
      const fileUrl = `/api/attachment?objectUrl=${encodeURIComponent(attachment.objectUrl)}&mimeType=${encodeURIComponent(attachment.mimeType)}`;
      window.open(fileUrl, "_blank");
    }
  };

  // Show error state
  if (hasError) {
    const errorMessage = personaImport.extra?.error;
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative min-h-screen">
        <div className="container mx-auto px-8 py-12 max-w-5xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-600 mb-6">
              <BrainIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">处理失败</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              处理文件时出现错误：{fileName}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-2xl mx-auto">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative">
      {/* 左侧装饰 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-500 via-purple-500 to-cyan-500 opacity-60" />
      <div className="fixed left-8 top-1/2 -translate-y-1/2 space-y-4 opacity-20 z-10">
        <div className="w-12 h-12 rounded-full bg-blue-400/30 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-purple-400/30 animate-pulse delay-300" />
        <div className="w-10 h-10 rounded-full bg-cyan-400/30 animate-pulse delay-700" />
        <div className="w-6 h-6 rounded-full bg-indigo-400/30 animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-8 py-12 max-w-5xl">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
              <BrainIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              智能人格画像生成
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {isProcessingComplete ? "处理完成：" : "正在处理文件："}
              {fileName}
            </p>
            {isProcessingComplete && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                所有任务已完成
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Processing Status */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
              <ProcessingStatus
                isProcessing={!personaAgentCompleted}
                isAnalyzing={!analysisCompleted}
                analysis={analysis}
                supplementaryQuestions={supplementaryQuestions}
                personas={personas}
                personaImportAnalysis={personaImport.analysis}
              />
            </div>

            {/* File Information and Re-analyze */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FileTextIcon className="size-4 text-white" />
                    </div>
                    上传文件信息
                  </h2>
                  <p className="text-gray-600 ml-11">查看原始文件或重新进行分析</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="size-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-800">{fileName}</p>
                      <p className="text-sm text-gray-600">PDF 文件</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewFile}
                      className="bg-white/70 hover:bg-white/90"
                    >
                      查看文件
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReAnalyze}
                      disabled={isReAnalyzing}
                      className="bg-white/70 hover:bg-white/90"
                    >
                      <RefreshCwIcon
                        className={`size-4 mr-2 ${isReAnalyzing ? "animate-spin" : ""}`}
                      />
                      {isReAnalyzing ? "重新分析中..." : "重新分析"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Persona Summary - only show if summary exists */}
            {personas.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <PersonaSummary personas={personas} />
              </div>
            )}

            {/* Analysis Result - only show if analysis exists */}
            {analysis && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <AnalysisResult analysis={analysis} />
              </div>
            )}

            {/* Supplementary Questions - only show if exists */}
            {supplementaryQuestions && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <SupplementaryQuestions
                  supplementaryQuestions={supplementaryQuestions}
                  fileName={fileName}
                  personaImportId={personaImport.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
