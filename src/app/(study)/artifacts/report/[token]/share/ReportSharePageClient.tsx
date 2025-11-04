"use client";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { truncateForTitle } from "@/lib/textUtils";
import { Loader2Icon, Play, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function SharePageHeader({
  studyReplayUrl,
  copyShareLink,
}: {
  studyReplayUrl: string;
  copyShareLink: () => void;
}) {
  const t = useTranslations("ReportSharePage");
  return (
    <GlobalHeader className="h-12">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
          <Link href={studyReplayUrl}>
            <Play size={14} />
            <span className="max-sm:text-xs max-sm:tracking-tighter">{t("viewReplay")}</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyShareLink}>
          <Share2 size={14} />
          <span className="hidden sm:inline">{t("copyLink")}</span>
        </Button>
        {/*<UserTokensBalance />*/}
        <UserMenu />
      </div>
    </GlobalHeader>
  );
}

export default function ReportSharePageClient({
  reportToken,
  studyReplayUrl,
  studyTitle,
}: {
  reportToken: string;
  studyReplayUrl: string;
  studyTitle: string;
}) {
  const t = useTranslations("ReportSharePage");
  const tCompliance = useTranslations("AICompliance");
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(100);
  const [iframeHeight, setIframeHeight] = useState<number | undefined>(undefined);

  const reportUrl = useMemo(() => {
    return `/artifacts/report/${reportToken}/raw`;
  }, [reportToken]);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth;
    const containerHeight = containerRef.current?.clientHeight;
    const MIN_WIDTH = 800;
    if (containerWidth && containerWidth < MIN_WIDTH) {
      const newRatio = Math.floor((containerWidth / MIN_WIDTH) * 100);
      setRatio(newRatio);
      setIframeHeight(containerHeight ? Math.floor((containerHeight / newRatio) * 100) : undefined);
    } else {
      setRatio(100);
      setIframeHeight(undefined);
    }
  }, []);

  const copyShareLink = useCallback(() => {
    const url = new URL(window.location.origin + window.location.pathname);
    const currentParams = new URLSearchParams(window.location.search);
    const utmSource = currentParams.get("utm_source") || "report";
    const utmMedium = currentParams.get("utm_medium") || "share";
    url.searchParams.set("utm_source", utmSource);
    url.searchParams.set("utm_medium", utmMedium);
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast.success(t("linkCopied"));
    });
  }, [t]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Update dimensions when component mounts and when container changes
  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  // 3s 以后强制取消 loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <SharePageHeader studyReplayUrl={studyReplayUrl} copyShareLink={copyShareLink} />

      <div className="flex-1 w-full relative overflow-hidden" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2Icon className="size-8 animate-spin" />
              <div className="text-sm text-muted-foreground">{t("title")}</div>
            </div>
          </div>
        )}

        <iframe
          src={reportUrl}
          className="flex-1 border-none"
          style={{
            width: ratio < 100 ? "800px" : "100%",
            height: iframeHeight ?? "100%",
            transform: ratio < 100 ? `scale(${ratio / 100})` : undefined,
            transformOrigin: "top left",
          }}
          onLoad={handleIframeLoad}
        />
      </div>

      <footer className="py-2 px-4 text-center text-xs text-muted-foreground border-t border-border">
        {t("attribution", {
          topic: truncateForTitle(studyTitle, { maxDisplayWidth: 60, suffix: "..." }),
        })}{" "}
        {tCompliance("shortDisclaimer")}
        {tCompliance("period")}
      </footer>
    </div>
  );
}
