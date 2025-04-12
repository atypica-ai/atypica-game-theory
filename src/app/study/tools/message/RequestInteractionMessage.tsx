import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RequestInteractionResult } from "@/tools/user/interaction";
import { ToolInvocation } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useState } from "react";
import { useStudyContext } from "../../hooks/StudyContext";

export const RequestInteractionMessage: FC<{
  toolInvocation: ToolInvocation;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: RequestInteractionResult;
  }) => void;
}> = ({ toolInvocation, addToolResult }) => {
  const t = useTranslations("StudyPage.ChatBox");
  const question = toolInvocation.args.question as string;
  const options = toolInvocation.args.options as string[];
  const { replay } = useStudyContext();

  // 用户操作中的 answer，不是 tool result 里面的 answer
  const [pendingAnswer, setPendingAnswer] = useState<string[]>([]);
  const toggleAnswer = useCallback((option: string) => {
    setPendingAnswer((prevAnswer) => {
      if (prevAnswer.includes(option)) {
        return prevAnswer.filter((a) => a !== option);
      } else {
        return [...prevAnswer, option];
      }
    });
  }, []);

  const confirmAnswer = useCallback(
    (pendingAnswer: string[]) => {
      if (toolInvocation.state !== "result") {
        addToolResult({
          toolCallId: toolInvocation.toolCallId,
          result:
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
        toolInvocation.state === "result" ? toolInvocation.result.answer : pendingAnswer;
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
      <div className="text-sm text-foreground/80 mb-3 flex items-center justify-start gap-1">
        <div className="flex-1">
          <strong>{question}</strong>
          {toolInvocation.state !== "result" && (
            <span className="ml-2 text-xs">({t("multiSelectHint")})</span>
          )}
        </div>
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      {toolInvocation.state === "result" || replay ? (
        <div className="flex flex-col items-start gap-2">
          {[...options].map((option, index) => (
            <div
              key={index}
              className={cn(
                "w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
                isActiveOption(option) && "bg-zinc-100 dark:bg-zinc-700 font-bold",
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
      ) : (
        <div className="flex flex-col items-start gap-2">
          {[...options].map((option, index) => (
            <div
              key={index}
              onClick={() => toggleAnswer(option)}
              className={cn(
                "w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
                "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700",
                isActiveOption(option) && "bg-zinc-100 dark:bg-zinc-700 font-bold",
              )}
            >
              {option}
            </div>
          ))}
          <div className="w-full flex flex-row justify-end gap-2">
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
      )}
    </div>
  );
};
