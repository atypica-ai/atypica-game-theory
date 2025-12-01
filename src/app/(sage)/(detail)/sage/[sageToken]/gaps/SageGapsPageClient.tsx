"use client";

import { createSageInterviewAction } from "@/app/(sage)/(detail)/actions";
import type {
  SageExtra,
  SageKnowledgeGapExtra,
  SageKnowledgeGapSeverity,
} from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Sage, SageKnowledgeGap } from "@/prisma/client";
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
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function SageGapsPageClient({
  sage,
  gaps,
}: {
  sage: Pick<Sage, "id"> & { extra: SageExtra };
  gaps: (Omit<SageKnowledgeGap, "severity" | "extra"> & {
    severity: SageKnowledgeGapSeverity;
    extra: SageKnowledgeGapExtra;
  })[];
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
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
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "important":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "nice-to-have":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("knowledgeGaps")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendingGaps.length} {t("pending")}, {resolvedGaps.length} {t("resolved")}
          </p>
        </div>
        {pendingGaps.length > 0 && (
          <Button onClick={handleCreateInterview} disabled={isCreating} size="sm">
            {isCreating ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            {t("createSupplementaryInterview")}
          </Button>
        )}
      </div>

      <Separator />

      {/* No Gaps State */}
      {gaps.length === 0 && (
        <div className="py-12 text-center">
          <CheckCircle2Icon className="mx-auto h-10 w-10 text-green-600 mb-3" />
          <p className="text-sm font-medium">{t("noKnowledgeGaps")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("noKnowledgeGapsDescription")}</p>
        </div>
      )}

      {/* Pending Gaps */}
      {pendingGaps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("pendingGaps")}</h2>
          <div className="space-y-3">
            {pendingGaps.map((gap) => {
              return (
                <div
                  key={gap.id}
                  className={`border-l-2 pl-3 py-2.5 space-y-3 ${getSeverityColor(gap.severity)}`}
                >
                  {/* Source Chat Link - if available */}
                  {gap.extra.sourceChat && (
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/40">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          💬 From conversation
                        </div>
                      </div>
                      <Link href={`/sage/chat/view/${gap.extra.sourceChat.token}`} target="_blank">
                        <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors shrink-0" />
                      </Link>
                    </div>
                  )}

                  {/* Gap Details */}
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(gap.severity)}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="text-sm font-medium">{gap.area}</div>
                      <div className="flex gap-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                          {gap.severity}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/80">{gap.description}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">{t("impact")}:</span> {gap.impact}
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
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("resolvedGaps")}</h2>
          <div className="space-y-2">
            {resolvedGaps.map((gap) => (
              <div key={gap.id} className="border-l-2 border-green-500/20 pl-3 py-2 opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <CheckCircle2Icon className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm font-medium line-through">{gap.area}</div>
                      <div className="text-xs px-1.5 py-0.5 rounded bg-muted inline-block">
                        resolved
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{gap.description}</div>
                    </div>
                  </div>
                  {gap.extra.resolvedChat && (
                    <Link href={`/sage/interview/${gap.extra.resolvedChat.token}`} target="_blank">
                      <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors shrink-0" />
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
