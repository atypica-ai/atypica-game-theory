"use client";
import { createSageInterviewAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import type { SageKnowledgeGapExtra, SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SageKnowledgeGap } from "@/prisma/client";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  InfoIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function SageGapsPageClient({
  gaps,
}: {
  gaps: (Omit<SageKnowledgeGap, "severity" | "extra"> & {
    severity: SageKnowledgeGapSeverity;
    extra: SageKnowledgeGapExtra;
  })[];
}) {
  const t = useTranslations("Sage.GapsPage");
  const router = useRouter();
  const { sage, processingStatus } = useSageContext();

  const prevProcessingStatusRef = useRef(processingStatus);
  // 处理结束以后，刷新一下 gaps
  useEffect(() => {
    if (prevProcessingStatusRef.current !== "ready" && processingStatus === "ready") {
      router.refresh();
    }
    prevProcessingStatusRef.current = processingStatus;
  }, [processingStatus, router]);

  const [isCreating, setIsCreating] = useState(false);

  const pendingGaps = gaps.filter((g) => !g.resolvedAt);
  const resolvedGaps = gaps.filter((g) => !!g.resolvedAt);

  const handleCreateInterview = useCallback(async () => {
    setIsCreating(true);
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
      setIsCreating(false);
    }
  }, [sage.id, router, t]);

  const getSeverityIcon = (severity: SageKnowledgeGapSeverity) => {
    switch (severity) {
      case "critical":
        return <AlertTriangleIcon className="h-4 w-4 text-red-600" />;
      case "important":
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case "nice-to-have":
        return <InfoIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <InfoIcon className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: SageKnowledgeGapSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "important":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "nice-to-have":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        {pendingGaps.length > 0 && (
          <ConfirmDialog
            title={t("confirmStartInterviewTitle")}
            description={t("confirmStartInterviewDesc")}
            onConfirm={handleCreateInterview}
          >
            <Button disabled={processingStatus === "processing" || isCreating} size="sm">
              {isCreating ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {t("createSupplementaryInterview")}
            </Button>
          </ConfirmDialog>
        )}
      </div>

      <Separator />

      {/* No Gaps State */}
      {gaps.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CheckCircle2Icon className="mx-auto h-10 w-10 text-green-600 mb-3" />
          <p className="text-sm font-medium">{t("noKnowledgeGaps")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("noKnowledgeGapsDescription")}</p>
        </div>
      )}

      {/* Pending Gaps */}
      {pendingGaps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight flex items-center gap-2">
            {t("pendingGaps")}
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal text-muted-foreground">
              {pendingGaps.length}
            </span>
          </h2>
          <div className="grid gap-3">
            {pendingGaps.map((gap) => {
              return (
                <div
                  key={gap.id}
                  className="group relative rounded-lg border p-4 hover:bg-muted/30 transition-all"
                >
                  {/* Source Chat Link - if available */}
                  {gap.extra.sourceChat && (
                    <div className="absolute top-4 right-4">
                      <Link
                        href={`/sage/chat/view/${gap.extra.sourceChat.token}`}
                        target="_blank"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="View source conversation"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  <div className="flex items-start gap-3 pr-8">
                    <div className="mt-0.5">{getSeverityIcon(gap.severity)}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{gap.area}</h3>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${getSeverityColor(
                            gap.severity,
                          )}`}
                        >
                          {gap.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{gap.description}</p>
                      <div className="text-xs bg-muted/50 p-2 rounded flex gap-1.5">
                        <span className="font-medium shrink-0">{t("impact")}:</span>
                        <span className="text-muted-foreground">{gap.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved Gaps */}
      {resolvedGaps.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-medium tracking-tight flex items-center gap-2">
            {t("resolvedGaps")}
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal text-muted-foreground">
              {resolvedGaps.length}
            </span>
          </h2>
          <div className="grid gap-2">
            {resolvedGaps.map((gap) => (
              <div
                key={gap.id}
                className="rounded-lg border bg-muted/30 px-4 py-3 opacity-80 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <CheckCircle2Icon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium line-through text-muted-foreground">
                          {gap.area}
                        </span>
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                          RESOLVED
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>
                    </div>
                  </div>
                  {gap.extra.resolvedChat && (
                    <Link
                      href={`/sage/interview/${gap.extra.resolvedChat.token}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
