import { fetchAnalystReportByToken } from "@/app/study/actions";
import { AnalystReportShareButton } from "@/app/study/components/AnalystReportShareButton";
import { AnalystReport } from "@/prisma/client";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC, useEffect, useState } from "react";
import { GenerateReportResult } from "../report";

export const GenerateReportResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: GenerateReportResult;
  };
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolMessage");
  const [report, setReport] = useState<Omit<AnalystReport, "onePageHtml"> | null>(null);

  useEffect(() => {
    const reportToken = toolInvocation.result.reportToken;
    if (reportToken) {
      fetchAnalystReportByToken(reportToken)
        .then((result) => {
          if (!result.success) throw result;
          setReport(result.data);
        })
        .catch((error) => console.log(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.args.reportToken, toolInvocation.state]);

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
      <AnalystReportShareButton reportToken={report.token}>
        <div
          className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
          dangerouslySetInnerHTML={{ __html: report.coverSvg }}
        ></div>
      </AnalystReportShareButton>
    </div>
  );
};
