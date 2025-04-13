import { Markdown } from "@/components/markdown";
import { ReasoningThinkingResult } from "@/tools/experts/reasoning";
import { ToolInvocation } from "ai";
import { FC } from "react";

export const ReasoningThinkingResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: ReasoningThinkingResult;
  };
}> = ({
  toolInvocation: {
    result: { reasoning, text },
  },
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="text-foreground/80 mb-3">{reasoning}</div>
      <Markdown>{text}</Markdown>
    </div>
  );
};
