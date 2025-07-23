"use client";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { BookOpen, FileText, MessageCircle, Target, Upload, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createPersonaImport } from "../actions";

interface PersonaImportClientProps {
  isUploadEnabled: boolean;
}

export default function PersonaImportClient({ isUploadEnabled }: PersonaImportClientProps) {
  const router = useRouter();
  const { uploadedFiles, handleFileUploaded, clearFiles } = useFileUploadManager();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("请先上传PDF文件");
      return;
    }

    const file = uploadedFiles[0];
    if (!file.mimeType.includes("pdf")) {
      toast.error("请上传PDF文件");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPersonaImport({
        // 确保只有这4个字段被保存
        objectUrl: file.objectUrl,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      });
      if (!result.success) throw result;
      const personaImport = result.data;
      router.push(`/persona-import/${personaImport.id}`);
    } catch (error) {
      console.error("Error creating persona import:", error);
      toast.error("创建失败，请重试");
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Persona Management</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Import interview records, analyze completeness, and generate interactive personas for your
          research and analysis needs.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className={`border border-slate-200 transition-colors ${!isUploadEnabled ? "opacity-60" : "hover:border-slate-300"}`}
        >
          <CardHeader>
            <CardTitle
              className={`flex items-center gap-2 ${!isUploadEnabled ? "text-slate-500" : "text-slate-900"}`}
            >
              <Upload className="size-5" />
              Import Interview
            </CardTitle>
            <CardDescription className={!isUploadEnabled ? "text-slate-500" : "text-slate-600"}>
              Upload PDF interview records and convert them to structured, LLM-compatible format
              {!isUploadEnabled && (
                <div className="mt-2 text-xs text-slate-400">(Admin access required)</div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`text-sm space-y-2 ${!isUploadEnabled ? "text-slate-500" : "text-slate-600"}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <span>PDF to Markdown conversion</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="size-4" />
                <span>4-dimension analysis & scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                <span>Supplementary question generation</span>
              </div>
            </div>

            {isUploadEnabled ? (
              uploadedFiles.length === 0 ? (
                <FileUploadButton
                  onFileUploadedAction={handleFileUploaded}
                  existingFiles={uploadedFiles}
                  showLimitsCheck={false}
                  disabled={isCreating}
                />
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-100 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <span className="text-sm font-medium">{uploadedFiles[0].name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearFiles} disabled={isCreating}>
                        重新选择
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleStartAnalysis} disabled={isCreating} className="w-full">
                    {isCreating ? "创建中..." : "开始分析"}
                  </Button>
                </div>
              )
            ) : (
              <Button disabled className="w-full" variant="outline">
                Upload Disabled
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <MessageCircle className="size-5" />
              Chat with Personas
            </CardTitle>
            <CardDescription className="text-slate-600">
              Interact with generated personas based on your interview data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                <span>Natural conversation interface</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="size-4" />
                <span>Behavior-driven responses</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <span>Multi-dimensional personality</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => router.push("/personas")}>
              View My Personas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Card */}
      <Card className="border border-slate-200 opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <BookOpen className="size-5" />
            Research with Personas
          </CardTitle>
          <CardDescription className="text-slate-600">
            Advanced research tools and analytics powered by persona data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="size-4" />
              <span>Market research simulations</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span>User testing scenarios</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <span>Behavioral analytics</span>
            </div>
          </div>
          <Button className="w-full" disabled variant="outline">
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Dimensions */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Analysis Dimensions</CardTitle>
          <CardDescription className="text-slate-600">
            Our system evaluates interview completeness across four key socio-psychological
            dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Demographic</h4>
              </div>
              <p className="text-sm text-slate-600">
                Social identity and growth trajectory analysis including age, education, occupation,
                and background.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Psychological</h4>
              </div>
              <p className="text-sm text-slate-600">
                Personality traits, emotional patterns, and internal motivations reflected in
                behavior.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Behavioral Economics</h4>
              </div>
              <p className="text-sm text-slate-600">
                Consumer behavior, decision preferences, and social influence patterns.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Political Cognition</h4>
              </div>
              <p className="text-sm text-slate-600">
                Cultural stance, information trust structures, and community belonging analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Getting Started</CardTitle>
          <CardDescription className="text-slate-600">
            Follow these simple steps to create your first persona
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Upload Interview PDF</h4>
                <p className="text-sm text-slate-600">
                  Start by uploading a PDF containing your interview transcripts or records.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Review Analysis</h4>
                <p className="text-sm text-slate-600">
                  Examine the completeness scores and identify areas that need additional
                  information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-900 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Generate & Chat</h4>
                <p className="text-sm text-slate-600">
                  Create an interactive persona and start chatting with it to validate insights.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-slate-300 text-slate-500 text-sm font-medium flex items-center justify-center mt-0.5">
                4
              </div>
              <div>
                <h4 className="font-medium text-slate-500">Use in Research (Coming Soon)</h4>
                <p className="text-sm text-slate-500">
                  Deploy personas in advanced research scenarios and analytics workflows.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
