"use client";

import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type FileUploadInfo } from "@/hooks/use-file-upload-manager";
import { AlertCircleIcon, BrainIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface UploadSectionProps {
  uploadedFiles: FileUploadInfo[];
  onFileUploadedAction: (file: FileUploadInfo) => void;
  onRemoveFileAction: (index: number) => void;
  onClearFilesAction: () => void;
  startProcessingAction: () => void;
  isProcessing: boolean;
  isAnalyzing: boolean;
}

export function UploadSection({
  uploadedFiles,
  onFileUploadedAction,
  onRemoveFileAction,
  onClearFilesAction,
  startProcessingAction,
  isProcessing,
  isAnalyzing,
}: UploadSectionProps) {
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

    startProcessingAction();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FileTextIcon className="size-4 text-white" />
          </div>
          上传访谈PDF文件
        </h2>
        <p className="text-gray-600 ml-11">
          上传包含访谈记录的PDF文件（仅支持单个文件），系统将同时生成人格画像总结和完整性分析
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {uploadedFiles.length === 0 ? (
            <FileUploadButton
              onFileUploadedAction={onFileUploadedAction}
              existingFiles={uploadedFiles}
              showLimitsCheck={false}
              disabled={isProcessing || isAnalyzing}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileTextIcon className="size-4" />
              <span>已上传 1 个文件</span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilesAction}
              disabled={isProcessing || isAnalyzing}
            >
              重新上传
            </Button>
          )}
          <Button
            onClick={handleProcessPDF}
            disabled={uploadedFiles.length === 0 || isProcessing || isAnalyzing}
            className="ml-auto"
          >
            {isProcessing || isAnalyzing ? (
              <>
                <Loader2Icon className="size-4 animate-spin mr-2" />
                处理中...
              </>
            ) : (
              <>
                <BrainIcon className="size-4 mr-2" />
                开始分析
              </>
            )}
          </Button>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileTextIcon className="size-5 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">{uploadedFiles[0].name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-white/70">
                    {(uploadedFiles[0].size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFileAction(0)}
                disabled={isProcessing || isAnalyzing}
                className="text-gray-500 hover:text-gray-700 hover:bg-white/50"
              >
                移除
              </Button>
            </div>
          </div>
        )}

        <div className="p-6 bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-2xl border border-amber-200/50">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 mb-2">新工作流程说明</h4>
              <ul className="space-y-1.5 text-sm text-amber-700">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  仅支持单个PDF文件上传，上传后将同时进行两个处理：生成人格画像总结 + 完整性分析
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  人格画像总结：基于内容直接生成可用的AI代理系统提示词
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  完整性分析：评估四个维度的信息覆盖度并生成补充问题
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  两个处理过程并行进行，互不等待，提高效率
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
