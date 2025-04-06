import { fetchAnalystReportByToken } from "@/app/study/actions";
import { AnalystReport } from "@prisma/client";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC, useEffect, useState } from "react";
import { AnalystReportShareButton } from "../AnalystReportShareButton";

export const GenerateReportResultMessage: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolMessage");
  const [report, setReport] = useState<Omit<AnalystReport, "onePageHtml"> | null>(null);

  useEffect(() => {
    let reportToken = toolInvocation.args.reportToken as string;
    if (toolInvocation.state === "result") {
      reportToken = toolInvocation.result.reportToken as string;
    }
    if (reportToken) {
      fetchAnalystReportByToken(reportToken)
        .then((report) => setReport(report))
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
      <AnalystReportShareButton publicReportUrl={`/artifacts/report/${report.token}/share`}>
        <div
          className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
          dangerouslySetInnerHTML={{ __html: report.coverSvg }}
        ></div>
      </AnalystReportShareButton>
    </div>
  );
};
