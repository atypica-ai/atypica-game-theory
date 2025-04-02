import { cn } from "@/lib/utils";
import { RequestInteractionResult } from "@/tools/user/interaction";
import { ToolInvocation } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useEffect } from "react";
import { useStudyContext } from "../../hooks/StudyContext";

export const RequestIteractionMessage: FC<{
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

  const { pendingUserToolInvocation, setPendingUserToolInvocation } = useStudyContext();
  useEffect(() => {
    if (
      pendingUserToolInvocation?.toolCallId == toolInvocation.toolCallId &&
      toolInvocation.state === "result"
    ) {
      setPendingUserToolInvocation(null);
    }
    if (!pendingUserToolInvocation && toolInvocation.state !== "result") {
      setPendingUserToolInvocation(toolInvocation);
    }
  }, [pendingUserToolInvocation, toolInvocation]);

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-sm text-foreground/80 mb-3 flex items-center justify-start gap-1">
        <strong>{question}</strong>
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      <div className="flex flex-col gap-2">
        {[...options, t("noneOfTheAbove")].map((option, index) => (
          <div
            key={index}
            onClick={() =>
              toolInvocation.state !== "result"
                ? addToolResult({
                    toolCallId: toolInvocation.toolCallId,
                    result: { answer: option, plainText: option },
                  })
                : null
            }
            className={cn(
              "text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-700",
              toolInvocation.state !== "result" &&
                "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700",
              toolInvocation.state === "result" &&
                toolInvocation.result.answer === option &&
                "bg-zinc-100 dark:bg-zinc-700 font-bold",
            )}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};
