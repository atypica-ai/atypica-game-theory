"use client";

import { useChat, experimental_useObject as useObject } from "@ai-sdk/react";
import { BrainIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AnalysisResult as AnalysisResultType,
  analysisSchema,
  PersonaImportAnalysis,
} from "../../types";
import { fetchPersonaImportById } from "../actions";
import { AnalysisResult } from "./AnalysisResult";
import { PersonaSummary } from "./PersonaSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { SupplementaryQuestions } from "./SupplementaryQuestions";

import { ChatMessageAttachment, PersonaImport } from "@/prisma/client";

export default function PersonaImportPage() {
  const params = useParams();
  const id = params.id as string;

  const [personaImport, setPersonaImport] = useState<PersonaImport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStartedProcessing, setHasStartedProcessing] = useState(false);

  // Hook for persona generation streaming
  const {
    messages: personaMessages,
    status,
    error: processError,
    append: submitPersonaSummary,
  } = useChat({
    api: "/api/persona/build-persona",
    onFinish: (message) => {
      if (message.content) {
        toast.success("人格画像生成成功");
        // The API will update the database automatically
        fetchPersonaImport();
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
      // The API will update the database automatically
      fetchPersonaImport();
    },
    onError: (error) => toast.error(`内容分析失败: ${error.message}`),
  });

  const fetchPersonaImport = async () => {
    try {
      const result = await fetchPersonaImportById(parseInt(id));
      if (result.success) {
        setPersonaImport(result.data);
      } else {
        toast.error(result.message || "获取数据失败");
      }
    } catch (error) {
      console.error("Error fetching persona import:", error);
      toast.error("获取数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPersonaImport();
    }
  }, [id]);

  useEffect(() => {
    // Auto-start processing if the import has attachments but no summary/analysis yet
    const attachments = personaImport?.attachments as ChatMessageAttachment[];
    if (
      personaImport &&
      !personaImport.summary &&
      !personaImport.analysis &&
      attachments &&
      attachments.length > 0 &&
      !hasStartedProcessing
    ) {
      setHasStartedProcessing(true);
      startProcessing();
    }
  }, [personaImport, hasStartedProcessing]);

  const startProcessing = async () => {
    const attachments = personaImport?.attachments as ChatMessageAttachment[];
    if (!personaImport || !attachments || attachments.length === 0) {
      return;
    }

    const file = attachments[0];
    const commonData = {
      fileUrl: file.objectUrl,
      fileName: file.name,
      mimeType: file.mimeType,
      personaImportId: personaImport.id.toString(),
    };

    // Start both processes
    submitPersonaSummary({ role: "user", content: "[READY]" }, { data: commonData });
    submitAnalysis(commonData);
  };

  const personaSummary = useMemo(() => {
    // First check if we have summary from database
    if (personaImport?.summary) {
      return personaImport.summary;
    }
    // Otherwise get from streaming messages
    const lastAssistantMessage = personaMessages.findLast(
      (message) => message.role === "assistant",
    );
    return lastAssistantMessage?.content || "";
  }, [personaMessages, personaImport?.summary]);

  const isProcessing = status === "ready" || status === "streaming";

  const analysisData = (personaImport?.analysis as PersonaImportAnalysis) || analysisObject;
  const analysis = analysisData?.analysis;
  const supplementaryQuestions = analysisData?.supplementaryQuestions;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative min-h-screen">
        <div className="container mx-auto px-8 py-12 max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 animate-pulse">
              <BrainIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">加载中...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!personaImport) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative min-h-screen">
        <div className="container mx-auto px-8 py-12 max-w-5xl">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-800">未找到分析记录</h1>
            <p className="text-gray-600 mt-2">请检查链接是否正确</p>
          </div>
        </div>
      </div>
    );
  }

  const attachments = personaImport?.attachments as ChatMessageAttachment[];
  const fileName = attachments?.[0]?.name || "文件";

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
              正在处理文件：{fileName}
            </p>
          </div>

          <div className="space-y-8">
            {/* Processing Status */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
              <ProcessingStatus
                isProcessing={isProcessing}
                isAnalyzing={isAnalyzing}
                personaSummary={personaSummary}
                analysis={analysis}
                supplementaryQuestions={supplementaryQuestions}
                personaImportSummary={personaImport?.summary}
                personaImportAnalysis={personaImport?.analysis}
              />
            </div>

            {/* Persona Summary - 实时显示 */}
            {(personaSummary || personaImport?.summary || isProcessing) && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <PersonaSummary
                  personaSummary={personaImport?.summary || personaSummary}
                  isProcessing={isProcessing && !personaImport?.summary}
                />
              </div>
            )}

            {/* Analysis Result */}
            {(analysis || (isAnalyzing && analysisObject?.analysis)) && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <AnalysisResult analysis={analysis || analysisObject?.analysis} />
              </div>
            )}

            {/* Supplementary Questions */}
            {(supplementaryQuestions ||
              (isAnalyzing && analysisObject?.supplementaryQuestions)) && (
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl p-8">
                <SupplementaryQuestions
                  supplementaryQuestions={
                    supplementaryQuestions || analysisObject?.supplementaryQuestions
                  }
                  fileName={fileName}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
