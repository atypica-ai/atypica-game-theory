import { BasicToolName, BasicUITools } from "@/ai/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ToolUIPart } from "ai";
import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";

export const ReasoningThinkingResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<BasicUITools, BasicToolName.reasoningThinking>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.ReasoningThinkingResultMessage");
  return (
    <div className="p-2 text-foreground/70 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mt-2 mb-3 flex flex-rows items-start justify-start gap-2">
        <BrainIcon className="mx-1 size-4 shrink-0" />
        <div className="flex-1 overflow-hidden">
          <span className="font-medium">{t("deepThinking")}: </span>
          {toolInvocation.input.question}
        </div>
      </div>
      <div className="flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId} className="size-6" />
        <div className="flex-1 overflow-hidden space-y-2">
          {toolInvocation.output.reasoning && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 p-2 rounded">
              {toolInvocation.output.reasoning}
            </div>
          )}
          <div className="text-xs">
            <Streamdown>{toolInvocation.output.text}</Streamdown>
          </div>
        </div>
      </div>
    </div>
  );
};
