"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startFastInsightResearch } from "../actions";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

interface RecommendationCardProps {
  pulseId: number;
  angle: string;
  pulse: {
    id: number;
    title: string;
    content: string;
    category: string;
    createdAt: Date;
  };
}

export function RecommendationCard({ angle, pulse }: RecommendationCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Pulse");
  const [isStarting, setIsStarting] = useState(false);

  const handleStartResearch = async () => {
    setIsStarting(true);
    try {
      const result = await startFastInsightResearch(angle);
      if (!result.success) {
        toast.error(result.message || t("startResearch"));
        return;
      }

      router.push(`/newstudy/${result.data.userChatToken}`);
    } catch {
      toast.error(t("startResearch"));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Angle - Primary information */}
        <div className="space-y-2">
          <p className="text-sm font-medium italic leading-relaxed border-l-2 border-primary pl-3">
            {angle}
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleStartResearch}
          disabled={isStarting}
          className="w-full sm:w-auto gap-2"
          size="lg"
        >
          {isStarting ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              {t("starting")}
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {t("startResearch")}
            </>
          )}
        </Button>

        {/* Pulse details - Secondary information */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pulse.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(pulse.createdAt, locale)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground line-clamp-1">
            {pulse.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{pulse.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
