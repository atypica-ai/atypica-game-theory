"use client";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { FileText, Lightbulb, Loader2, MessageCircle, Scale, Target, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { analysisSchema, processSchema } from "../types";

export default function PersonaImportPage() {
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles } =
    useFileUploadManager();
  const [activeTab, setActiveTab] = useState<string>("interview");

  // Use useObject hooks for streaming
  const {
    object: processObject,
    submit: submitProcess,
    isLoading: isProcessing,
    error: processError,
  } = useObject({
    api: "/api/persona/process-pdf",
    schema: processSchema,
    onFinish: (result) => {
      if (result?.object?.interviewRecord) {
        toast.success("PDF processed successfully");
        // Auto-trigger analysis after processing
        submitAnalysis({ interviewRecord: result.object.interviewRecord });
      }
    },
    onError: (error) => {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF");
    },
  });

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
        toast.success("Interview analysis completed");
        setActiveTab("analysis");
      }
    },
    onError: (error) => {
      console.error("Error analyzing interview:", error);
      toast.error("Failed to analyze interview");
    },
  });

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

    submitProcess({
      fileUrl: file.url,
      fileName: file.name,
      mimeType: file.mimeType,
    });
  };

  const handleAnalyzeInterview = () => {
    const recordToAnalyze = processObject?.interviewRecord;

    if (!recordToAnalyze?.trim()) {
      toast.error("No interview record to analyze");
      return;
    }

    submitAnalysis({
      interviewRecord: recordToAnalyze,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 3) return "bg-green-500";
    if (score >= 2) return "bg-yellow-500";
    if (score >= 1) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 3) return "Excellent";
    if (score >= 2) return "Good";
    if (score >= 1) return "Fair";
    return "Poor";
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case "Demographic":
        return <Users className="size-5" />;
      case "Psychological":
        return <MessageCircle className="size-5" />;
      case "BehavioralEconomics":
        return <Target className="size-5" />;
      case "PoliticalCognition":
        return <Scale className="size-5" />;
      default:
        return <FileText className="size-5" />;
    }
  };

  // Show processing errors
  if (processError || analysisError) {
    console.error("Processing error:", processError);
    console.error("Analysis error:", analysisError);
  }

  const analysis = analysisObject?.analysis;
  const supplementaryQuestions = analysisObject?.supplementaryQuestions;

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Persona Import</h1>
          <p className="text-muted-foreground mt-2">
            Upload an interview PDF, convert it to structured format, and analyze its completeness
            for persona generation.
          </p>
        </div>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Upload Interview PDF
            </CardTitle>
            <CardDescription>
              Upload a PDF file containing interview records to process and analyze.
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
                  Clear
                </Button>
              )}
              <Button
                onClick={handleProcessPDF}
                disabled={uploadedFiles.length === 0 || isProcessing || isAnalyzing}
                className="ml-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Processing PDF...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Process & Analyze PDF"
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
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Converting PDF to structured interview format...
                  </span>
                </div>
                {processObject?.processingNotes && (
                  <p className="text-xs text-blue-600 mt-1">{processObject.processingNotes}</p>
                )}
              </div>
            )}

            {/* Analysis Status */}
            {isAnalyzing && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-purple-600" />
                  <span className="text-sm text-purple-800">
                    Analyzing interview completeness and generating recommendations...
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {analysisObject?.analysis && (
                    <div className="text-xs text-purple-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Dimensional analysis complete
                    </div>
                  )}
                  {analysisObject?.supplementaryQuestions && (
                    <div className="text-xs text-purple-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Supplementary questions generated
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interview">Interview Record</TabsTrigger>
            <TabsTrigger value="analysis" disabled={!analysis}>
              Analysis
              {analysis && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {analysis.total_score}/12
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={!supplementaryQuestions}>
              Questions
              {supplementaryQuestions?.questions && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {supplementaryQuestions.questions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Interview Record</span>
                  {!isProcessing && !isAnalyzing && (
                    <Button
                      onClick={handleAnalyzeInterview}
                      disabled={!processObject?.interviewRecord?.trim()}
                      size="sm"
                      variant="outline"
                    >
                      Re-analyze Interview
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>LLM-standardized interview format in Markdown</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={processObject?.interviewRecord ?? ""}
                  readOnly
                  className="h-[400px] font-mono text-sm"
                  placeholder="Interview record will appear here as it's being processed..."
                />
                {processObject?.processingNotes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Processing Notes:</h4>
                    <p className="text-sm text-muted-foreground">{processObject.processingNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {analysis?.total_score && (
              <>
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Overall Analysis Score</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {analysis.total_score} / 12
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(analysis.total_score / 12) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {analysis.total_score >= 9
                        ? "Excellent coverage across all dimensions"
                        : analysis.total_score >= 6
                          ? "Good coverage with some areas for improvement"
                          : analysis.total_score >= 3
                            ? "Fair coverage but needs significant enhancement"
                            : "Poor coverage requiring substantial additional information"}
                    </p>
                  </CardContent>
                </Card>

                {/* Dimension Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis).map(([dimension, data]) => {
                    if (dimension === "total_score") return null;
                    const dimensionData = data as { score: number; reason: string };
                    return (
                      <Card key={dimension}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-lg">
                            <div className="flex items-center gap-2">
                              {getDimensionIcon(dimension)}
                              {dimension}
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full transition-colors ${getScoreColor(dimensionData.score)}`}
                              />
                              <Badge variant="outline">{dimensionData.score}/3</Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={dimensionData.score >= 2 ? "default" : "destructive"}>
                                {getScoreLabel(dimensionData.score)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{dimensionData.reason}</p>
                          </div>
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
                    Supplementary Questions
                  </CardTitle>
                  <CardDescription>
                    Suggested questions to improve the persona profile completeness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Reasoning:</h4>
                    <p className="text-sm text-muted-foreground">
                      {supplementaryQuestions.reasoning}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Recommended Questions:</h4>
                    <div className="space-y-2">
                      {(supplementaryQuestions.questions ?? []).map((question, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium text-primary">Q{index + 1}:</span>{" "}
                            {question}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      Generate Shareable Link for Questions
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Create a link to share these questions with the interviewee for additional
                      responses
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
