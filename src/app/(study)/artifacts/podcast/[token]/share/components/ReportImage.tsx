"use client";
import { AnalystReportExtra } from "@/prisma/client";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ReportImage({
  report: { token: reportToken, onePageHtml },
}: {
  report: {
    token: string;
    onePageHtml?: string;
    extra?: AnalystReportExtra;
  };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(100);
  const [iframeHeight, setIframeHeight] = useState<number | undefined>(undefined);

  const reportUrl = useMemo(() => {
    return `/artifacts/report/${reportToken}/raw`;
  }, [reportToken]);

  const reportHtml = useMemo(() => {
    return onePageHtml
      ? onePageHtml + '<div style="width: 100%; height: 30rem;"></div>'
      : undefined;
  }, [onePageHtml]);

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

  // 3s timeout to force stop loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="h-full w-full relative bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden"
      ref={containerRef}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2Icon className="size-8 animate-spin" />
            <div className="text-sm text-muted-foreground">Loading report...</div>
          </div>
        </div>
      )}

      <iframe
        srcDoc={reportHtml ? reportHtml : undefined}
        src={!reportHtml ? reportUrl : undefined}
        className="border-none"
        style={{
          width: ratio < 100 ? "800px" : "100%",
          height: iframeHeight ?? "100%",
          transform: ratio < 100 ? `scale(${ratio / 100})` : undefined,
          transformOrigin: "top left",
        }}
        onLoad={handleIframeLoad}
        title="Report"
      />
    </div>
  );
}
