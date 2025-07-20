"use client";

import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useChat, experimental_useObject as useObject } from "@ai-sdk/react";
import { BrainIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AnalysisResult as AnalysisResultType,
  analysisSchema,
  PersonaAnalysisData,
} from "../types";
import { AnalysisResult } from "./AnalysisResult";
import { PersonaSummary } from "./PersonaSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { SupplementaryQuestions } from "./SupplementaryQuestions";
import { UploadSection } from "./UploadSection";

export default function PersonaImportPage() {
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles } =
    useFileUploadManager();

  const [analysisData, setAnalysisData] = useState<PersonaAnalysisData | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  // Hook for persona generation streaming
  const {
    messages: personaMessages,
    isLoading: isProcessing,
    error: processError,
    append: submitPersonaSummary,
  } = useChat({
    api: "/api/persona/build-persona",
    onFinish: (message) => {
      if (message.content) {
        toast.success("人格画像生成成功");
        setAnalysisData((prev) => ({
          ...prev!,
          personaSummary: message.content,
        }));
      }
    },
    onError: (error) => toast.error(`人格画像生成失败: ${error.message}`),
  });

  // Hook for analysis object streaming
  const {
    object: analysisObject,
    submit: submitAnalysis,
    isLoading: isAnalyzing,
    error: analysisError,
  } = useObject<AnalysisResultType>({
    api: "/api/persona/analyze-interview",
    schema: analysisSchema,
    onFinish: (result) => {
      toast.success("内容分析成功");
      setAnalysisData((prev) => ({
        ...prev!,
        analysis: result.object?.analysis,
        supplementaryQuestions: result.object?.supplementaryQuestions,
      }));
    },
    onError: (error) => toast.error(`内容分析失败: ${error.message}`),
  });

  const personaSummary = useMemo(() => {
    const lastAssistantMessage = personaMessages.findLast(
      (message) => message.role === "assistant",
    );
    return lastAssistantMessage?.content || "";
  }, [personaMessages]);

  const analysis = analysisData?.analysis;
  const supplementaryQuestions = analysisData?.supplementaryQuestions;

  const startProcessingAction = () => {
    const file = uploadedFiles[0];
    if (!file) return;

    setIsStarted(true);

    const commonData = {
      fileUrl: file.url,
      fileName: file.name,
      mimeType: file.mimeType,
    };

    setAnalysisData({
      fileName: file.name,
      fileUrl: file.url,
      mimeType: file.mimeType,
    });

    submitPersonaSummary({ role: "user", content: "[READY]" }, { data: commonData });

    submitAnalysis(commonData);
  };

  if (processError || analysisError) {
    console.error("Processing error:", processError);
    console.error("Analysis error:", analysisError);
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
              上传访谈PDF，AI将并行生成人格画像并进行深度分析，助您快速洞察用户心理
            </p>
          </div>

          {/* Upload Section */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
            <UploadSection
              uploadedFiles={uploadedFiles}
              onFileUploadedAction={handleFileUploaded}
              onRemoveFileAction={handleRemoveFile}
              onClearFilesAction={() => {
                clearFiles();
                setIsStarted(false);
                setAnalysisData(null);
              }}
              startProcessingAction={startProcessingAction}
              isProcessing={isProcessing}
              isAnalyzing={isAnalyzing}
            />
          </div>

          {isStarted && (
            <div className="space-y-8">
              {/* Processing Status */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <ProcessingStatus
                  isProcessing={isProcessing}
                  isAnalyzing={isAnalyzing}
                  personaSummary={personaSummary}
                  analysis={analysis}
                  supplementaryQuestions={supplementaryQuestions}
                />
              </div>

              {/* Persona Summary - 实时显示 */}
              {(personaSummary || isProcessing) && (
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                  <PersonaSummary personaSummary={personaSummary} isProcessing={isProcessing} />
                </div>
              )}

              {/* Analysis Result */}
              {!isAnalyzing && analysis && (
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                  <AnalysisResult analysis={analysis} />
                </div>
              )}

              {/* Supplementary Questions */}
              {!isAnalyzing && supplementaryQuestions && (
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                  <SupplementaryQuestions
                    supplementaryQuestions={supplementaryQuestions}
                    fileName={analysisData?.fileName || "export"}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
