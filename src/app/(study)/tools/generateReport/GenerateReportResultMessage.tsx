import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { AnalystReportShareButton } from "@/app/(study)/study/components/AnalystReportShareButton";
import { useOptionalStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const GenerateReportResultMessage = ({
  toolInvocation,
  onClickReport,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.generateReport>>,
    { state: "output-available" }
  >;
  onClickReport?: (payload: { toolCallId: string; reportToken: string }) => void;
}) => {
  const studyContext = useOptionalStudyContext();

  const t = useTranslations("Components.GenerateReportResultMessage");
  const [report, setReport] = useState<{
    token: string;
    coverCdnHttpUrl?: string;
  }>({
    token: toolInvocation.output.reportToken ?? toolInvocation.input.reportToken,
  });

  useEffect(() => {
    const reportToken = toolInvocation.output.reportToken;
    if (reportToken) {
      fetchAnalystReportByToken(reportToken)
        .then((result) => {
          if (!result.success) throw result;
          setReport(result.data);
        })
        .catch((error) => console.log(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.input.reportToken, toolInvocation.state]);

  if (!report) return null;

  const cover = (
    <div
      className={cn(
        "relative mb-4 w-[360px] h-[202.5px] border border-input/50 rounded-md overflow-hidden",
        onClickReport ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-pointer",
      )}
    >
      {report.coverCdnHttpUrl ? (
        <Image src={report.coverCdnHttpUrl} alt="Report cover" fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground"></div>
      )}
    </div>
  );

  return (
    <div className="">
      <div className="text-sm mt-4 mb-2">{t("reportGenerated")}</div>
      {/* <Link
        className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
        href={`/artifacts/report/${report.token}/share`}
        target="_blank"
        dangerouslySetInnerHTML={{ __html: report.coverSvg }}
      ></Link> */}
      {onClickReport ? (
        <button
          type="button"
          onClick={() => onClickReport({ toolCallId: toolInvocation.toolCallId, reportToken: report.token })}
          className="block text-left"
        >
          {cover}
        </button>
      ) : (
        <AnalystReportShareButton
          reportToken={report.token}
          download={studyContext && !studyContext.replay} // 没有 studyContext 的时候页禁用
        >
          {/*<div
            className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
            dangerouslySetInnerHTML={{ __html: report.coverSvg }}
          ></div>*/}
          {cover}
        </AnalystReportShareButton>
      )}
    </div>
  );
};
