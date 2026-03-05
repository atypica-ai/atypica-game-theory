"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createContextBuilderChat } from "../actions";

export default function ContextBuilderPageClient() {
  const router = useRouter();
  const t = useTranslations("Team.MemoryBuilder.startPage");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await createContextBuilderChat();
      if (result.success) {
        router.push(`/team/memory-builder/${result.data.userChatToken}`);
      } else {
        toast.error(result.message || t("createFailed"));
      }
    } catch (error) {
      console.error("Failed to create context builder chat:", error);
      toast.error(t("createFailedRetry"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      <div
        className={cn(
          "flex flex-col md:flex-row items-center gap-8 md:gap-12",
          "transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="w-12 h-1 bg-ghost-green"></div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400">
            {t("subtitle")}
          </p>
          <Button
            size="lg"
            className="rounded-full has-[>svg]:px-8 px-8 h-12"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? t("startingButton") : t("startButton")}
            {!loading && <ArrowRightIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
