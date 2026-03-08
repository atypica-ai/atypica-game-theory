"use client";

import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";

export function ReasoningThinkingExecutionView({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.reasoningThinking>>;
}) {
  const t = useTranslations("StudyPage.ToolConsole");
  return (
    <div
      className={cn(
        "p-3 mb-3 text-foreground/70 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs",
      )}
    >
      <div className="mt-2 mb-3 font-medium flex flex-rows items-start justify-start gap-2">
        <HippyGhostAvatar seed={toolInvocation.toolCallId.substring(1)} className="size-6" />
        <div className="flex-1 overflow-hidden">
          {t("deepThinking")}: {toolInvocation.input?.question}
        </div>
      </div>
      {toolInvocation.state === "output-available" ? (
        <div className={cn("flex flex-rows items-start justify-start gap-2")}>
          <HippyGhostAvatar seed={toolInvocation.toolCallId} className="size-6" />
          <div className="flex-1 overflow-hidden">
            <div>{toolInvocation.output.reasoning}</div>
            <Streamdown mode="static">{toolInvocation.output.text}</Streamdown>
          </div>
        </div>
      ) : null}
    </div>
  );
}
