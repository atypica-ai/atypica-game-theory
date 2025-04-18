"use client";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function ReportSharePageClient({
  reportToken,
  studyReplayUrl,
  analystTopic,
}: {
  reportToken: string;
  studyReplayUrl: string;
  analystTopic: string;
}) {
  const t = useTranslations("Artifacts.ReportSharePage");
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  const reportUrl = useMemo(() => {
    return `/artifacts/report/${reportToken}/raw`;
  }, [reportToken]);

  const copyShareLink = useCallback(() => {
    const url = window.location.origin + pathname;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("linkCopied"));
    });
  }, [pathname, t]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // 3s 以后强制取消 loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <GlobalHeader>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => window.open(studyReplayUrl, "_blank")}
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">{t("viewReplay")}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyShareLink}>
              <Share2 size={14} />
              <span className="hidden sm:inline">{t("copyLink")}</span>
            </Button>
          </div>
        </div>
      </GlobalHeader>

      <div className="flex-1 w-full relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              <div className="text-sm text-muted-foreground">{t("title")}</div>
            </div>
          </div>
        )}

        <iframe
          src={reportUrl}
          className="flex-1 w-full h-full border-none"
          onLoad={handleIframeLoad}
        />
      </div>

      <footer className="py-2 px-4 text-center text-xs text-muted-foreground border-t border-border">
        <span>
          {t("attribution", {
            topic: analystTopic.length > 30 ? analystTopic.substring(0, 30) + "..." : analystTopic,
          })}
        </span>
      </footer>
    </div>
  );
}
