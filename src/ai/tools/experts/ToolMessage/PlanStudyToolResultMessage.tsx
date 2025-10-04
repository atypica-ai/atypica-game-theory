import { ToolName, UIToolConfigs } from "@/ai/tools/types";
import { Markdown } from "@/components/markdown";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";

export const PlanStudyToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<UIToolConfigs, ToolName.planStudy>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.PlanStudyToolResultMessage");
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="text-sm font-medium mb-2">📋 {t("studyPlan")}</div>
      <Markdown>{toolInvocation.output.text}</Markdown>
    </div>
  );
};
