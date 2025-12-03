"use client";
import { createSageInterviewAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { discoverKnowledgeGapsAction } from "@/app/(sage)/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  DatabaseIcon,
  FileTextIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function SageStatsOverview() {
  const t = useTranslations("Sage.SageStats");
  const router = useRouter();
  const isSM = useMediaQuery("sm");
  const { sage, processingStatus, stats } = useSageContext();
  const [isRequesting, setIsRequesting] = useState(false);

  const isProcessing = processingStatus === "processing" || isRequesting;

  const handleAnalyze = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await discoverKnowledgeGapsAction({ sageId: sage.id });
      if (!result.success) throw result;
      toast.success(t("analyzeStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Failed to analyze chats:", error);
      toast.error(t("analyzeFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  const handleStartInterview = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await createSageInterviewAction(sage.id);
      if (!result.success) throw result;
      const { userChat } = result.data;
      toast.success(t("interviewCreated"));
      router.push(`/sage/interview/${userChat.token}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
      toast.error(t("createInterviewFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  // Derive status for sources
  const sourcesStatus =
    processingStatus === "processing"
      ? "processing"
      : stats.sourcesTotal > stats.sourcesExtracted
        ? "attention"
        : stats.sourcesTotal === 0
          ? "ready"
          : "completed";

  // Derive status for memory
  const memoryStatus =
    processingStatus === "processing"
      ? "processing"
      : stats.workingMemoryPendingCount > 0
        ? "attention"
        : "completed";

  // Derive status for gaps
  const gapsStatus = stats.gapsCount > 0 ? "attention" : "completed";

  return (
    <>
      <div
        className={cn(
          "p-6 mt-4 sm:m-6",
          "overflow-x-scroll sm:overflow-hidden",
          "sm:border sm:rounded-xl sm:shadow-xs sm:bg-card",
        )}
      >
        <div
          className={cn(
            "gap-6",
            "max-sm:w-fit max-sm:flex max-sm:flex-row max-sm:flex-nowrap",
            "sm:grid sm:grid-cols-3 xl:grid-cols-5",
          )}
        >
          {/* 1. Sources */}
          <StageCard
            icon={<FileTextIcon className="size-5" />}
            status={sourcesStatus}
            label={t("sources")}
            count={stats.sourcesTotal}
            description={
              stats.sourcesTotal > stats.sourcesExtracted
                ? t("sourcesWaiting", { count: stats.sourcesTotal - stats.sourcesExtracted })
                : t("sourcesParsed", { count: stats.sourcesExtracted })
            }
            href={isSM ? undefined : `/sage/${sage.token}/sources`}
          />

          {/* 2. Memory */}
          <StageCard
            icon={<DatabaseIcon className="size-5" />}
            status={memoryStatus}
            label={t("memory")}
            count={stats.memoryVersion}
            description={
              processingStatus === "processing"
                ? t("integrating")
                : stats.workingMemoryPendingCount > 0
                  ? t("itemsPending", { count: stats.workingMemoryPendingCount })
                  : t("synced")
            }
            href={`/sage/${sage.token}/memory`}
          />

          {/* 3. User Chats */}
          <StageCard
            icon={<MessageSquareIcon className="size-5" />}
            status="ready"
            label={t("userChats")}
            count={stats.chatsCount}
            description={t("chatsDescription", { count: stats.chatsCount })}
            href={`/sage/${sage.token}/chats`}
          >
            <ConfirmDialog
              title={t("confirmAnalyzeTitle")}
              description={t("confirmAnalyzeDesc")}
              onConfirm={handleAnalyze}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={isProcessing || stats.chatsCount === 0}
              >
                <SparklesIcon className="size-3" />
                {t("analyzeChats")}
              </Button>
            </ConfirmDialog>
          </StageCard>

          {/* 4. Knowledge Gaps */}
          <StageCard
            icon={<TriangleAlertIcon className="size-5" />}
            status={gapsStatus}
            label={t("knowledgeGaps")}
            count={stats.gapsCount}
            description={t("itemsPending", { count: stats.gapsCount })}
            href={`/sage/${sage.token}/gaps`}
          >
            <ConfirmDialog
              title={t("confirmStartInterviewTitle")}
              description={t("confirmStartInterviewDesc")}
              onConfirm={handleStartInterview}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={isProcessing || stats.gapsCount === 0}
              >
                <MicIcon className="size-3" />
                {t("startInterview")}
              </Button>
            </ConfirmDialog>
          </StageCard>

          {/* 5. Interviews */}
          <StageCard
            icon={<MicIcon className="size-5" />}
            status="ready"
            label={t("interviews")}
            count={stats.interviewsCount}
            description={t("interviewsDescription", { count: stats.interviewsCount })}
            href={`/sage/${sage.token}/interviews`}
          />
        </div>
      </div>
    </>
  );
}

// Simple StageCard component
function StageCard({
  icon,
  status,
  label,
  count,
  description,
  href,
  children,
}: {
  icon: React.ReactNode;
  status: "ready" | "processing" | "attention" | "completed";
  label: string;
  count?: number;
  description?: string;
  href?: string;
  children?: React.ReactNode;
}) {
  const statusColors = {
    ready: "border-muted-foreground/30 text-muted-foreground",
    processing: "border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/10",
    attention: "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10",
    completed: "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/10",
  };

  const Wrapper = ({ children, className }: { children: React.ReactNode; className?: string }) =>
    href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  return (
    <div className="flex flex-col gap-3 min-w-30">
      {/* Icon and Info */}
      <div className="flex flex-col items-center text-center gap-2">
        <Wrapper className="contents">
          <div
            className={cn(
              "size-12 rounded-full border-2 flex items-center justify-center transition-colors",
              statusColors[status],
            )}
          >
            {status === "processing" ? <Loader2Icon className="size-5 animate-spin" /> : icon}
          </div>
          <div className="font-medium flex items-center gap-2 justify-center">
            <span className="whitespace-nowrap text-xs sm:text-sm">{label}</span>
            {count !== undefined && (
              <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
        </Wrapper>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
            {description}
          </div>
        )}
      </div>

      {/* Actions */}
      {children && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}
