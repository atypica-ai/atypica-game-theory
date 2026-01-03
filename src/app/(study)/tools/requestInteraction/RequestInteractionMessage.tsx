import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools, TAddStudyUIToolResult } from "@/app/(study)/tools/types";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Streamdown } from "streamdown";

export const RequestInteractionMessage = <
  T extends ToolUIPart<
    // {[StudyToolName.requestInteraction]: UIToolConfigs[StudyToolName.requestInteraction]},
    Pick<StudyUITools, StudyToolName.requestInteraction>
  >,
>({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: T;
  addToolResult?: TAddStudyUIToolResult;
}) => {
  const t = useTranslations("StudyPage.ChatBox");
  // input 有可能为空, 当 state === "input-streaming" 时
  // const question = toolInvocation.input?.question ?? "";
  const options = toolInvocation.input?.options ?? [];
  const maxSelect = toolInvocation.input?.maxSelect;
  const { replay } = useStudyContext();

  // 用户操作中的 answer，不是 tool result 里面的 answer
  const [pendingAnswer, setPendingAnswer] = useState<string[]>([]);
  const toggleAnswer = useCallback(
    (option: string) => {
      setPendingAnswer((prevAnswer) => {
        if (prevAnswer.includes(option)) {
          // 取消选择
          return prevAnswer.filter((a) => a !== option);
        } else {
          // 添加选择
          if (maxSelect === 1) {
            // 单选：直接替换
            return [option];
          } else if (maxSelect && prevAnswer.length >= maxSelect) {
            // 多选但已达到限制：不添加
            return prevAnswer;
          } else {
            // 多选且未达到限制：添加
            return [...prevAnswer, option];
          }
        }
      });
    },
    [maxSelect],
  );

  const confirmAnswer = useCallback(
    (pendingAnswer: string[]) => {
      if (toolInvocation.state === "input-available" && addToolResult) {
        addToolResult({
          tool: StudyToolName.requestInteraction,
          toolCallId: toolInvocation.toolCallId,
          output:
            pendingAnswer.length > 0
              ? {
                  answer: pendingAnswer,
                  plainText: JSON.stringify(pendingAnswer),
                }
              : {
                  answer: [],
                  plainText: t("noneOfTheAbove"),
                },
        });
      }
    },
    [toolInvocation.state, toolInvocation.toolCallId, addToolResult, t],
  );

  const isActiveOption = useCallback(
    (option: string) => {
      const answer: string | string[] =
        toolInvocation.state === "output-available" ? toolInvocation.output.answer : pendingAnswer;
      if (
        (answer === "以上都不是" ||
          answer === "None of the above" ||
          (Array.isArray(answer) && answer.length === 0)) &&
        option === "NONE_OF_THE_ABOVE"
      ) {
        return true;
      }
      if (Array.isArray(answer) && typeof option === "string") {
        return answer.includes(option);
      }
      return answer === option;
    },
    [toolInvocation, pendingAnswer],
  );

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-xs text-foreground/80 mb-3 flex items-start justify-between gap-1">
        {toolInvocation.input ? (
          <Streamdown isAnimating={toolInvocation.state === "input-streaming"}>
            {toolInvocation.input.question ?? ""}
          </Streamdown>
        ) : null}
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      {toolInvocation.state === "output-available" || replay ? (
        <div className="flex flex-col items-start gap-2">
          {[...options].map((option, index) => (
            <div
              key={index}
              className={cn(
                "w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
                isActiveOption(option!) && "bg-zinc-100 dark:bg-zinc-700 font-bold",
              )}
            >
              {option}
            </div>
          ))}
          {isActiveOption("NONE_OF_THE_ABOVE") && (
            // 以上都不是的选项结果只在用户确实这么选择的时候才显示
            <div
              className={cn(
                "w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
                "bg-zinc-100 dark:bg-zinc-700 font-bold",
              )}
            >
              {t("noneOfTheAbove")}
            </div>
          )}
        </div>
      ) : toolInvocation.state === "input-available" ? (
        <div className="flex flex-col items-start gap-2">
          {[...options].map((option, index) => (
            <div
              key={index}
              onClick={() => toggleAnswer(option!)}
              className={cn(
                "w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
                "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700",
                isActiveOption(option!) && "bg-zinc-100 dark:bg-zinc-700 font-bold",
              )}
            >
              {option}
            </div>
          ))}
          <div className="w-full flex flex-row items-center justify-end gap-2">
            {toolInvocation.state === "input-available" && (
              <div className="text-xs text-muted-foreground">
                {maxSelect === 1
                  ? `(${t("singleSelectHint")})`
                  : maxSelect
                    ? `(${t("maxSelectHint", { max: maxSelect })})`
                    : `(${t("multiSelectHint")})`}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="px-6 text-xs"
              onClick={() => {
                confirmAnswer([]);
              }}
            >
              {t("noneOfTheAbove")}
            </Button>
            {pendingAnswer.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="px-6 text-xs"
                onClick={() => confirmAnswer(pendingAnswer)}
              >
                {t("confirm")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        // toolInvocation.state === "input-streaming", 选项还不完整，什么也不显示
        <LoadingPulse />
      )}
    </div>
  );
};
