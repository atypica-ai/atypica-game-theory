"use client";
import { analyzeSageKnowledge, extractSageKnowledgeAction } from "@/app/(sage)/(detail)/actions";
import type { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Sage } from "@/prisma/client";
import { ExternalLinkIcon, Loader2Icon, ScanSearchIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AvatarUpload } from "./components/AvatarUpload";

export function SageDetailPageClient({
  sage,
}: {
  sage: Pick<Sage, "id" | "token" | "name" | "locale" | "bio" | "domain"> & {
    expertise: string[];
    extra: SageExtra;
    avatar: SageAvatar;
  };
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleExtractKnowledge = useCallback(async () => {
    setIsExtracting(true);
    try {
      const result = await extractSageKnowledgeAction(sage.id);
      if (!result.success) throw result;
      toast.success(t("extractionStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error extracting knowledge:", error);
      toast.error(t("extractionFailed"));
    } finally {
      setIsExtracting(false);
    }
  }, [sage.id, router, t]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSageKnowledge(sage.id);
      if (!result.success) throw result;
      toast.success(t("analysisStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error analyzing:", error);
      toast.error(t("analysisFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [sage.id, t, router]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-start gap-2">
        <AvatarUpload sageId={sage.id} sageName={sage.name} currentAvatar={sage.avatar} />
        <div className="ml-4">
          <h1 className="text-xl font-semibold">{sage.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sage.domain}</p>
        </div>
        <div className="ml-auto"></div>
        <Button
          onClick={handleExtractKnowledge}
          disabled={isExtracting}
          variant="default"
          size="sm"
        >
          {isExtracting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          {t("extractKnowledgeButton")}
        </Button>
        <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="outline" size="sm">
          {isAnalyzing ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ScanSearchIcon className="size-4" />
          )}
          {t("analyzeGapsButton")}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/sage/profile/${sage.token}`} target="_blank">
            <ExternalLinkIcon className="size-4" />
            {t("viewPublicProfile")}
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Basic Info */}
      <div className="space-y-3">
        <div className="space-y-2 text-sm">
          {sage.bio && (
            <div>
              <div className="text-xs text-muted-foreground">{t("bio")}</div>
              <p className="text-sm mt-1">{sage.bio}</p>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">{t("expertise")}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Array.isArray(sage.expertise) ? sage.expertise : []).map((exp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                >
                  {String(exp)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t("locale")}:</span>{" "}
            <span>{sage.locale}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
