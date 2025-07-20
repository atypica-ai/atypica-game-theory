"use client";

import { Button } from "@/components/ui/button";
import { BotIcon, CopyIcon, Loader2Icon } from "lucide-react";

interface PersonaSummaryProps {
  personaSummary: string;
  isProcessing: boolean;
}

export function PersonaSummary({ personaSummary, isProcessing }: PersonaSummaryProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to use a toast notification here
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
              <BotIcon className="size-4 text-white" />
            </div>
            生成的人格画像总结
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(personaSummary)}
            disabled={!personaSummary}
            className="bg-white/70 hover:bg-white/90"
          >
            <CopyIcon className="size-4 mr-2" />
            复制
          </Button>
        </div>
        <p className="text-gray-600 ml-11">基于PDF内容生成的AI代理系统提示词，可直接用于对话模拟</p>
      </div>

      <div className="relative">
        <div className="text-sm whitespace-pre-wrap p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200/50 min-h-[200px] leading-relaxed shadow-sm">
          {personaSummary ||
            (isProcessing ? "正在生成人格画像总结..." : "人格画像总结将在此处显示...")}
        </div>
        {isProcessing && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Loader2Icon className="size-5 animate-spin text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-800">正在生成人格画像总结...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
