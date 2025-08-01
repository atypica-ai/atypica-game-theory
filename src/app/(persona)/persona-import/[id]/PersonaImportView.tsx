"use client";
import { Button } from "@/components/ui/button";
import { ChatMessageAttachment, Persona, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { BrainIcon, FileTextIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { reAnalyzePersonaImport } from "../../actions";
import { PersonaImportAnalysis } from "../../types";
import { AnalysisResult } from "./AnalysisResult";
import { FollowUpChatList } from "./FollowUpChatList";
import { PersonaSummary } from "./PersonaSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { SupplementaryQuestions } from "./SupplementaryQuestions";

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
      <div className="container mx-auto px-8 py-12 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-red-100 mb-6">
            <BrainIcon className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">处理失败</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">处理文件时出现错误：{fileName}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-12 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-900 mb-4">
          <BrainIcon className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">智能人格画像生成</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {isProcessingComplete ? "处理完成：" : "正在处理文件："}
          {fileName}
        </p>
        {isProcessingComplete && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            所有任务已完成
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Processing Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <ProcessingStatus
            isProcessing={!personaAgentCompleted}
            isAnalyzing={!analysisCompleted}
            personas={personas}
            personaImportAnalysis={personaImport.analysis}
          />
        </div>

        {/* File Information and Re-analyze */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
                <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                  <FileTextIcon className="size-3 text-white" />
                </div>
                上传文件信息
              </h2>
              <p className="text-slate-600 ml-9 text-sm">查看原始文件或重新进行分析</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileTextIcon className="size-4 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">{fileName}</p>
                  <p className="text-sm text-slate-600">PDF 文件</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleViewFile}>
                  查看文件
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReAnalyze}
                  disabled={isReAnalyzing}
                >
                  <RefreshCwIcon className={`size-4 mr-2 ${isReAnalyzing ? "animate-spin" : ""}`} />
                  {isReAnalyzing ? "重新分析中..." : "重新分析"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Persona Summary - only show if summary exists */}
        {personas.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <PersonaSummary personas={personas} />
          </div>
        )}

        {/* Analysis Result - only show if analysis exists */}
        {analysis && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <AnalysisResult analysis={analysis} />
          </div>
        )}

        {/* Supplementary Questions - only show if exists */}
        {supplementaryQuestions && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <SupplementaryQuestions
              supplementaryQuestions={supplementaryQuestions}
              fileName={fileName}
              personaImportId={personaImport.id}
            />
          </div>
        )}

        {/* Follow Up Chat */}
        <FollowUpChatList personaImportId={personaImport.id} />
      </div>
    </div>
  );
}
