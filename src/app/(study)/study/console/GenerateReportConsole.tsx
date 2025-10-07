import { StudyUITools, ToolName } from "@/ai/tools/types";
import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { AnalystReportShareButton } from "@/app/(study)/study/components/AnalystReportShareButton";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

export const GenerateReportConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, ToolName.generateReport>>;
}) => {
  const { replay } = useStudyContext();
  const t = useTranslations("StudyPage.ToolConsole");

  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(100);
  const [iframeHeight, setIframeHeight] = useState(1200);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth;
    const containerHeight = containerRef.current?.clientHeight;
    const ratio = Math.floor((containerWidth ? containerWidth / 1200 : 1) * 100);
    setRatio(ratio);
    setIframeHeight(containerHeight ? Math.floor((containerHeight / ratio) * 100) : 1200);
  }, []);

  // Update dimensions when component mounts and when container changes
  useEffect(() => {
    updateDimensions();
    // Set up ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    // Set up window resize listener
    window.addEventListener("resize", updateDimensions);
    // Set up periodic check for size changes
    const intervalId = setInterval(updateDimensions, 2000);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
      clearInterval(intervalId);
    };
  }, [updateDimensions]);

  const [analystReport, setAnalystReport] = useState<ExtractServerActionData<
    typeof fetchAnalystReportByToken
  > | null>(null);

  useEffect(() => {
    let reportToken = toolInvocation.input?.reportToken;
    if (toolInvocation.state === "output-available") {
      reportToken = toolInvocation.output.reportToken;
    }
    if (reportToken) {
      fetchAnalystReportByToken(reportToken)
        .then((result) => {
          if (!result.success) throw result;
          setAnalystReport(result.data);
        })
        .catch((error) => console.log(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.input?.reportToken, toolInvocation.state]);

  return (
    <div className={cn("h-full relative", !analystReport?.generatedAt ? "pb-10" : "pb-10")}>
      <div className="h-full" ref={containerRef}>
        {analystReport && (
          <iframe
            src={`/artifacts/report/${analystReport.token}/raw?live=1`}
            className={cn("w-[1200px]")}
            style={{
              transform: `scale(${ratio / 100})`,
              transformOrigin: "top left",
              height: iframeHeight,
            }}
          />
        )}
      </div>
      {!analystReport?.generatedAt ? (
        <div className="flex mt-4 gap-px items-center justify-start text-zinc-500 dark:text-zinc-300 text-xs font-mono">
          <span className="animate-bounce">✨ </span>
          <span className="ml-2">{t("reportBeingGenerated")} </span>
        </div>
      ) : (
        <div className="absolute right-0 bottom-0">
          {/* <Button asChild variant="ghost" size="sm">
            <Link href={publicReportUrl} target="_blank">
              {t("shareReport")}
            </Link>
          </Button> */}
          <AnalystReportShareButton reportToken={analystReport.token} download={!replay} />
        </div>
      )}
    </div>
  );
};
