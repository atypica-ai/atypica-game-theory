"use client";

import type { Sage, SageKnowledgeGap } from "@/prisma/client";
import type { SageExtra } from "../../../types";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createSupplementaryInterview } from "../../../actions";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };

export function GapsTab({ sage, gaps }: { sage: SageWithExtra; gaps: SageKnowledgeGap[] }) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const pendingGaps = gaps.filter((g) => g.status === "pending");
  const resolvedGaps = gaps.filter((g) => g.status === "resolved");

  const handleCreateInterview = useCallback(async () => {
    setIsCreating(true);
    try {
      const result = await createSupplementaryInterview(sage.id);
      if (!result.success) throw result;

      const { userChat } = result.data;
      toast.success("Interview created successfully");
      router.push(`/sage/interview/${userChat.token}`);
    } catch (error) {
      console.error("Failed to create interview:", error);
      toast.error("Failed to create interview");
    } finally {
      setIsCreating(false);
    }
  }, [sage.id, router]);

  const getSeverityIcon = (severity: string) => {
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

  const getSeverityColor = (severity: string) => {
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
          <h1 className="text-2xl font-bold">{t("knowledgeGaps")}</h1>
          <p className="text-muted-foreground mt-1">
            {pendingGaps.length} {t("pending")}, {resolvedGaps.length} {t("resolved")}
          </p>
        </div>
        {pendingGaps.length > 0 && (
          <Button onClick={handleCreateInterview} disabled={isCreating}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Supplementary Interview
          </Button>
        )}
      </div>

      <Separator />

      {/* No Gaps State */}
      {gaps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2Icon className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <p className="font-medium">{t("noKnowledgeGaps")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("noKnowledgeGapsDescription")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending Gaps */}
      {pendingGaps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("pendingGaps")}</h2>
          <div className="space-y-3">
            {pendingGaps.map((gap) => (
              <Card key={gap.id} className={`border-l-4 ${getSeverityColor(gap.severity)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getSeverityIcon(gap.severity)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{gap.area}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {gap.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {gap.sourceType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("description")}:
                    </p>
                    <p className="text-sm">{gap.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("impact")}:
                    </p>
                    <p className="text-sm">{gap.impact}</p>
                  </div>
                  {gap.sourceDescription && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("source")}: {gap.sourceDescription}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Gaps */}
      {resolvedGaps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("resolvedGaps")}</h2>
          <div className="space-y-3">
            {resolvedGaps.map((gap) => (
              <Card key={gap.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-through">{gap.area}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {gap.resolvedBy || "resolved"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
