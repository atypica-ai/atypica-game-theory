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

      const shareUrl = `${window.location.origin}/persona/followup/${result.data.token}`;
      await copyToClipboard(shareUrl);
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
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <LightbulbIcon className="size-4 text-white" />
          </div>
          综合补充问题
        </h2>
        <p className="text-gray-600 ml-11">基于分析结果生成的建议问题，用于改进人格画像的完整性</p>
      </div>
      <div className="space-y-6">
        <div className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200/50">
          <h4 className="font-semibold mb-3 text-amber-800">生成理由</h4>
          <p className="text-sm text-amber-700 leading-relaxed">
            {supplementaryQuestions.reasoning}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800">建议追问问题</h4>
          </div>
          <div className="grid gap-3">
            {(supplementaryQuestions.questions ?? []).map((question, index) => {
              // Skip empty or undefined questions
              if (!question) return null;

              return (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-200/50 rounded-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{question}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(question)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-white/50 px-2 py-1 h-auto"
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200/50">
            <Button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              variant="outline"
              onClick={handleCreateShareLink}
              disabled={isCreatingLink}
            >
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
