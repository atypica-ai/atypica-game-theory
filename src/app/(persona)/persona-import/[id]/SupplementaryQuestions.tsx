"use client";
import { Button } from "@/components/ui/button";
import { CopyIcon, LightbulbIcon, ShareIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createFollowUpInterviewChat } from "../../actions";
import { AnalysisResult } from "../../types";

interface SupplementaryQuestionsProps {
  supplementaryQuestions: AnalysisResult["supplementaryQuestions"] | undefined;
  fileName: string;
  personaImportId: number;
}

export function SupplementaryQuestions({
  supplementaryQuestions,
  // fileName,
  personaImportId,
}: SupplementaryQuestionsProps) {
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("已复制到剪贴板");
    });
  };

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true);
    try {
      const result = await createFollowUpInterviewChat(personaImportId);
      if (!result.success) {
        throw new Error(result.message || "创建分享链接失败");
      }
      const shareUrl = `${window.location.origin}/persona-followup/${result.data.token}`;
      copyToClipboard(shareUrl);
      toast.success("分享链接已创建并复制到剪贴板");
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error("创建分享链接失败，请重试");
    } finally {
      setIsCreatingLink(false);
    }
  };

  if (!supplementaryQuestions || !supplementaryQuestions.questions) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
            <LightbulbIcon className="size-3 text-white" />
          </div>
          综合补充问题
        </h2>
        <p className="text-slate-600 ml-9 text-sm">
          基于分析结果生成的建议问题，用于改进人格画像的完整性
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-medium mb-2 text-amber-900">生成理由</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            {supplementaryQuestions.reasoning}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-slate-900">建议追问问题</h4>
          <div className="grid gap-3">
            {(supplementaryQuestions.questions ?? []).map((question, index) => {
              // Skip empty or undefined questions
              if (!question) return null;

              return (
                <div key={index} className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{question}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(question)}
                      className="text-slate-400 hover:text-slate-600 px-2 py-1 h-auto"
                    >
                      <CopyIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <Button className="w-full" onClick={handleCreateShareLink} disabled={isCreatingLink}>
              <ShareIcon className="size-4 mr-2" />
              {isCreatingLink ? "生成中..." : "生成分享链接"}
            </Button>
            <p className="text-xs text-green-700 mt-2 text-center">
              创建链接发送给受访者，用于收集补充回答
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
