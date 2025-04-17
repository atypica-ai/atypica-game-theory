import { fetchAnalystReportByToken } from "@/app/study/actions";
import { AnalystReportShareButton } from "@/app/study/components/AnalystReportShareButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { ReasoningThinkingResult } from "@/tools/experts/reasoning";
import { ScoutTaskChatResult } from "@/tools/experts/scoutTask";
import { AnalystReport } from "@prisma/client";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC, useEffect, useMemo, useState } from "react";

export const ReasoningThinkingResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: ReasoningThinkingResult;
  };
}> = ({ toolInvocation }) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mt-2 mb-6 font-medium flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId.substring(1)} className="size-6" />
        <div>{toolInvocation.args.question}</div>
      </div>
      <div className="flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId} className="size-6" />
        <div className="flex-1 overflow-hidden gap-3">
          <div className="text-foreground/80">{toolInvocation.result.reasoning}</div>
          <Markdown>{toolInvocation.result.text}</Markdown>
        </div>
      </div>
    </div>
  );
};

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
      <AnalystReportShareButton publicReportUrl={`/artifacts/report/${report.token}/share`}>
        <div
          className="block mb-4 w-[360px] h-[180px] [&>svg]:w-[360px] [&>svg]:h-[180px] cursor-pointer border border-input/50 rounded-md overflow-hidden"
          dangerouslySetInnerHTML={{ __html: report.coverSvg }}
        ></div>
      </AnalystReportShareButton>
    </div>
  );
};

export const ScoutTaskResultMessage: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const personas = useMemo(() => {
    if (toolInvocation.state === "result") {
      const { personas } = toolInvocation.result as ScoutTaskChatResult;
      return personas;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.state]);

  if (!personas || personas.length === 0) {
    return <div className="text-sm text-muted-foreground">No personas found.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Personas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50 p-3 bg-zinc-50 dark:bg-zinc-800"
          >
            <HippyGhostAvatar seed={persona.id} className="mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm">{persona.name}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {persona.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
