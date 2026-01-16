"use client";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export default function InterviewReportSharePageClient({
  reportToken,
  onePageHtml,
  structuredData,
}: {
  reportToken: string;
  onePageHtml: string;
  structuredData?: {
    title: string;
    description: string;
  };
}) {
  const t = useTranslations("InterviewProject.reportShare");
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(100);
  const [iframeHeight, setIframeHeight] = useState<number | undefined>(undefined);

  const reportUrl = useMemo(() => {
    return `/artifacts/interview-report/${reportToken}/raw`;
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
    const url = window.location.origin + pathname;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("copyLinkToClipboard"));
    });
  }, [pathname, t]);

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
    }, 1000); // 现在是用了 srcDoc, 超时可以短一点了
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      {/* JSON-LD structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Report",
              headline: structuredData.title,
              description: structuredData.description,
              author: {
                "@type": "Organization",
                name: "atypica.AI",
                url: "https://www.atypica.ai",
              },
            }),
          }}
        />
      )}

      {/* Hidden HTML content for SEO crawlers */}
      <article hidden dangerouslySetInnerHTML={{ __html: onePageHtml }} />

      <GlobalHeader className="h-12">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 has-[>svg]:px-2 gap-1.5 text-xs"
            onClick={copyShareLink}
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">{t("copyLink")}</span>
          </Button>
        </div>
      </GlobalHeader>

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
          // srcDoc={onePageHtml}  // 微信里有问题，需要研究下有原因
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
        <span>{t("poweredBy")}</span>
      </footer>
    </div>
  );
}
