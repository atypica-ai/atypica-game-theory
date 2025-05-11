import { ReasoningThinkingResult } from "@/ai/tools/experts/reasoning";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Markdown } from "@/components/markdown";
import { ToolInvocation } from "ai";
import { FC } from "react";

export const ReasoningThinkingResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: ReasoningThinkingResult;
  };
}> = ({ toolInvocation }) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mt-2 mb-6 font-medium flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId.substring(1)} className="size-6" />
        <div className="flex-1 overflow-hidden">{toolInvocation.args.question}</div>
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
