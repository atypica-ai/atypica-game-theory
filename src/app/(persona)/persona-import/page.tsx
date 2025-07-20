"use client";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useChat, experimental_useObject as useObject } from "@ai-sdk/react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  Brain,
  CheckCircle,
  Copy,
  Download,
  FileText,
  Lightbulb,
  Loader2,
  Scale,
  Target,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { analysisSchema, PersonaAnalysisData } from "../types";

export default function PersonaImportPage() {
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles } =
    useFileUploadManager();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [analysisData, setAnalysisData] = useState<PersonaAnalysisData | null>(null);

  // Use useChat hook for persona generation streaming
  const {
    messages: personaMessages,
    status: processStatus,
    error: processError,
    append: submitPersonaSummary,
  } = useChat({
    api: "/api/persona/build-persona",
    onFinish: (message) => {
      if (message.content) {
        toast.success("Persona summary generated successfully");
        setAnalysisData((prev) => ({
          ...prev!,
          personaSummary: message.content,
        }));
        setActiveTab("persona");
      }
    },
    onError: (error) => {
      console.error("Error generating persona summary:", error);
      toast.error("Failed to generate persona summary");
    },
  });

  const isProcessing = processStatus === "submitted" || processStatus === "streaming";

  // Get current persona summary
  const personaSummary = useMemo(() => {
    const lastAssistantMessage = personaMessages.findLast(
      (message) => message.role === "assistant",
    );
    return lastAssistantMessage?.content || "";
  }, [personaMessages]);

  // Use useObject hook for analysis
  const {
    object: analysisObject,
    submit: submitAnalysis,
    isLoading: isAnalyzing,
    error: analysisError,
  } = useObject({
    api: "/api/persona/analyze-interview",
    schema: analysisSchema,
    onFinish: (result) => {
      if (result?.object?.analysis) {
        toast.success("Analysis completed successfully");
        setAnalysisData((prev) => ({
          ...prev!,
          analysis: result.object!.analysis,
          supplementaryQuestions: result.object!.supplementaryQuestions,
        }));
        setActiveTab("analysis");
      }
    },
    onError: (error) => {
      console.error("Error analyzing content:", error);
      toast.error("Failed to analyze content");
    },
  });

  const analysis = analysisObject?.analysis;
  const supplementaryQuestions = analysisObject?.supplementaryQuestions;

  const handleProcessPDF = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload a PDF file first");
      return;
    }

    const file = uploadedFiles[0];
    if (!file.mimeType.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    // Initialize analysis data
    setAnalysisData({
      fileName: file.name,
      fileUrl: file.url,
      mimeType: file.mimeType,
    });

    // Start both processes simultaneously
    // Clear previous messages and start persona generation
    submitPersonaSummary(
      { role: "user", content: "[READY]" },
      {
        data: {
          fileUrl: file.url,
          fileName: file.name,
          mimeType: file.mimeType,
        },
      },
    );

    submitAnalysis({
      fileUrl: file.url,
      fileName: file.name,
      mimeType: file.mimeType,
    });

    setActiveTab("processing");
  };

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
        return <Users className="size-5" />;
      case "Psychological":
        return <Brain className="size-5" />;
      case "BehavioralEconomics":
        return <Target className="size-5" />;
      case "PoliticalCognition":
        return <Scale className="size-5" />;
      default:
        return <FileText className="size-5" />;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("已复制到剪贴板");
    });
  };

  const exportQuestions = (questions: string[], title: string) => {
    const content = `补充问题 - ${title}\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n")}\n\n导出时间: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `补充问题-${title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Show processing errors
  if (processError || analysisError) {
    console.error("Processing error:", processError);
    console.error("Analysis error:", analysisError);
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">智能人格画像生成</h1>
          <p className="text-muted-foreground mt-2">
            上传访谈PDF文件，同时生成人格画像总结和分析其完整性，获取改进建议
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">上传文件</TabsTrigger>
            <TabsTrigger value="processing" disabled={!isProcessing && !isAnalyzing}>
              处理中
              {(isProcessing || isAnalyzing) && <Loader2 className="size-3 animate-spin ml-2" />}
            </TabsTrigger>
            <TabsTrigger value="persona" disabled={!personaSummary}>
              人格画像
              {!isProcessing && personaSummary && (
                <CheckCircle className="size-3 text-green-600 ml-2" />
              )}
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!analysis}>
              分析结果
              {analysis && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {analysis.total_score}/12
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={!supplementaryQuestions}>
              补充问题
              {supplementaryQuestions?.questions && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {supplementaryQuestions.questions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  上传访谈PDF文件
                </CardTitle>
                <CardDescription>
                  上传包含访谈记录的PDF文件，系统将同时生成人格画像总结和完整性分析
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <FileUploadButton
                    onFileUploadedAction={handleFileUploaded}
                    existingFiles={uploadedFiles}
                    showLimitsCheck={false}
                  />
                  {uploadedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFiles}
                      disabled={isProcessing || isAnalyzing}
                    >
                      清除
                    </Button>
                  )}
                  <Button
                    onClick={handleProcessPDF}
                    disabled={uploadedFiles.length === 0 || isProcessing || isAnalyzing}
                    className="ml-auto"
                  >
                    {isProcessing || isAnalyzing ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Brain className="size-4 mr-2" />
                        开始分析
                      </>
                    )}
                  </Button>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4" />
                      <span className="text-sm font-medium">{uploadedFiles[0].name}</span>
                      <Badge variant="outline">
                        {(uploadedFiles[0].size / (1024 * 1024)).toFixed(2)} MB
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(0)}
                        disabled={isProcessing || isAnalyzing}
                      >
                        移除
                      </Button>
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>新工作流程说明：</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• 上传PDF后将同时进行两个处理：生成人格画像总结 + 完整性分析</li>
                      <li>• 人格画像总结：基于内容直接生成可用的AI代理系统提示词</li>
                      <li>• 完整性分析：评估四个维度的信息覆盖度并生成补充问题</li>
                      <li>• 两个处理过程并行进行，互不等待，提高效率</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5" />
                  处理进度
                </CardTitle>
                <CardDescription>正在并行处理PDF文件：生成人格画像总结和完整性分析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 人格画像生成状态 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4" />
                      <span className="font-medium">人格画像生成</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isProcessing ? (
                        <Loader2 className="size-4 animate-spin text-blue-600" />
                      ) : personaSummary ? (
                        <CheckCircle className="size-4 text-green-600" />
                      ) : (
                        <AlertCircle className="size-4 text-gray-400" />
                      )}
                      <span className="text-sm">
                        {isProcessing ? "生成中..." : personaSummary ? "已完成" : "等待中"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{
                        width: `${isProcessing ? 50 : personaMessages.length > 0 && personaMessages[personaMessages.length - 1]?.content ? 100 : 0}%`,
                      }}
                    />
                  </div>
                  {isProcessing && personaSummary && (
                    <div className="text-xs text-blue-600 mt-2">
                      正在生成人格画像... {personaSummary?.length || 0} 字符
                    </div>
                  )}
                </div>

                <Separator />

                {/* 分析状态 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4" />
                      <span className="font-medium">完整性分析</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAnalyzing ? (
                        <Loader2 className="size-4 animate-spin text-purple-600" />
                      ) : analysis ? (
                        <CheckCircle className="size-4 text-green-600" />
                      ) : (
                        <AlertCircle className="size-4 text-gray-400" />
                      )}
                      <span className="text-sm">
                        {isAnalyzing ? "分析中..." : analysis ? "已完成" : "等待中"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${isAnalyzing ? 50 : analysis ? 100 : 0}%` }}
                    />
                  </div>
                  {analysis && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      维度分析完成，总分：{analysis.total_score || 0}/12
                    </div>
                  )}
                  {supplementaryQuestions && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      已生成 {supplementaryQuestions.questions?.length || 0} 个补充问题
                    </div>
                  )}
                </div>

                {personaSummary && analysis && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>处理完成！</strong> 人格画像总结和完整性分析都已完成。
                      请切换到相应标签页查看结果。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="persona" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="size-5" />
                    <span>生成的人格画像总结</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(personaMessages[personaMessages.length - 1]?.content || "")
                      }
                      disabled={
                        !personaMessages.length ||
                        !personaMessages[personaMessages.length - 1]?.content
                      }
                    >
                      <Copy className="size-4 mr-2" />
                      复制
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  基于PDF内容生成的AI代理系统提示词，可直接用于对话模拟
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs whitespace-pre-wrap p-4 bg-muted/50">
                  {personaSummary ?? ""}
                </div>
                {isProcessing && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-800">正在实时生成人格画像总结...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {analysis && (
              <>
                {/* 总体评分 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>整体分析评分</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {analysis.total_score} / 12
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((analysis.total_score || 0) / 12) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {(analysis.total_score || 0) >= 9
                        ? "各维度覆盖度优秀，信息全面深入"
                        : (analysis.total_score || 0) >= 6
                          ? "覆盖度良好，部分维度可进一步优化"
                          : (analysis.total_score || 0) >= 3
                            ? "覆盖度一般，需要重点补充关键信息"
                            : "覆盖度不足，需要大量补充各维度信息"}
                    </p>
                  </CardContent>
                </Card>

                {/* 各维度详细评分 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis).map(([dimension, data]) => {
                    if (dimension === "total_score") return null;
                    const dimensionData = data as {
                      score: number;
                      reason: string;
                      questions?: string[];
                    };
                    return (
                      <Card key={dimension}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-lg">
                            <div className="flex items-center gap-2">
                              {getDimensionIcon(dimension)}
                              {getDimensionName(dimension)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-lg font-bold ${getScoreColor(dimensionData.score)}`}
                              >
                                {dimensionData.score}/3
                              </span>
                              <Badge
                                variant={
                                  dimensionData.score >= 3
                                    ? "default"
                                    : dimensionData.score === 2
                                      ? "secondary"
                                      : "destructive"
                                }
                                className={
                                  dimensionData.score === 2 ? "bg-orange-100 text-orange-800" : ""
                                }
                              >
                                {getScoreLabel(dimensionData.score)}
                              </Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{dimensionData.reason}</p>

                          {dimensionData.questions && dimensionData.questions.length > 0 && (
                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">针对性补充问题</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    exportQuestions(
                                      dimensionData.questions!,
                                      `${getDimensionName(dimension)}`,
                                    )
                                  }
                                >
                                  <Download className="size-3 mr-1" />
                                  导出
                                </Button>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {dimensionData.questions.map((question, index) => (
                                  <div
                                    key={index}
                                    className="text-xs p-2 bg-secondary/50 rounded border-l-2 border-primary/30"
                                  >
                                    <span className="font-medium text-primary">Q{index + 1}:</span>{" "}
                                    {question}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            {supplementaryQuestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="size-5" />
                    综合补充问题
                  </CardTitle>
                  <CardDescription>
                    基于分析结果生成的建议问题，用于改进人格画像的完整性
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">生成理由：</h4>
                    <p className="text-sm text-muted-foreground">
                      {supplementaryQuestions.reasoning}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">建议追问问题：</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            exportQuestions(
                              (supplementaryQuestions.questions || []).filter(
                                (q): q is string => !!q,
                              ),
                              analysisData?.fileName || "补充问题",
                            )
                          }
                        >
                          <Download className="size-4 mr-2" />
                          导出问题
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              (supplementaryQuestions.questions || [])
                                .filter((q): q is string => !!q)
                                .join("\n"),
                            )
                          }
                        >
                          <Copy className="size-4 mr-2" />
                          复制全部
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(supplementaryQuestions.questions ?? []).map((question, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm flex-1">
                              <span className="font-medium text-primary">Q{index + 1}:</span>{" "}
                              {question}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(question || "")}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      生成分享链接
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      创建链接发送给受访者，用于收集补充回答
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
