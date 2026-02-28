"use client";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createContextBuilderChat } from "../actions";

export default function ContextBuilderPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await createContextBuilderChat();
      if (result.success) {
        router.push(`/team/memory-builder/${result.data.userChatToken}`);
      } else {
        toast.error(result.message || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create context builder chat:", error);
      toast.error("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-24 md:py-40 px-6 flex flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-12">
        <div className="space-y-6">
          <div className="w-20 h-20 mx-auto bg-linear-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <SparklesIcon className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-EuclidCircularA font-medium tracking-tight">
            构建团队的背景档案
          </h1>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            通过 10-15 分钟的友好对话，让 AI 深入了解团队的工作背景、目标和需求。构建的记忆将帮助 AI
            更好地为团队服务。
          </p>
        </div>

        <div className="space-y-6">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={loading}
            className="rounded-full px-10 h-12 text-base font-medium"
          >
            {loading ? "创建中..." : "开始访谈"}
          </Button>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            访谈内容将用于构建团队的 Memory，提升 AI 对团队的理解
          </p>
        </div>
      </div>
    </div>
  );
}
