import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { AnalystReportShareButton } from "@/app/(study)/study/components/AnalystReportShareButton";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

export const GenerateReportResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.generateReport>>,
    { state: "output-available" }
  >;
}) => {
  const { replay } = useStudyContext();
  const t = useTranslations("Components.GenerateReportResultMessage");
  const [report, setReport] = useState<ExtractServerActionData<
    typeof fetchAnalystReportByToken
  > | null>(null);

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

  return (
    <div className="">
      <div className="text-sm mt-4 mb-2">{t("reportGenerated")}</div>
      {/* <Link
        className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
        href={`/artifacts/report/${report.token}/share`}
        target="_blank"
        dangerouslySetInnerHTML={{ __html: report.coverSvg }}
      ></Link> */}
      <AnalystReportShareButton reportToken={report.token} download={!replay}>
        {/*<div
          className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
          dangerouslySetInnerHTML={{ __html: report.coverSvg }}
        ></div>*/}
        <div className="relative mb-4 w-[360px] h-[202.5px] cursor-pointer border border-input/50 rounded-md overflow-hidden">
          {report.coverCdnHttpUrl ? (
            <Image src={report.coverCdnHttpUrl} alt="Report cover" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground"></div>
          )}
        </div>
      </AnalystReportShareButton>
    </div>
  );
};
