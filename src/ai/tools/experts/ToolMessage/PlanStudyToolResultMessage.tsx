import { ReasoningThinkingResult } from "@/ai/tools/experts/reasoning/types";
import { Markdown } from "@/components/markdown";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC } from "react";

export const PlanStudyToolResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: ReasoningThinkingResult;
  };
}> = ({ toolInvocation }) => {
  const t = useTranslations("Components.PlanStudyToolResultMessage");
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="text-sm font-medium mb-2">📋 {t("studyPlan")}</div>
      <Markdown>{toolInvocation.result.text}</Markdown>
    </div>
  );
};
