"use client";

import { StudyUITools, TAddStudyUIToolResult, ToolName } from "@/ai/tools/types";
import { saveAnalystFromPlan } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { CheckCircle2Icon, FileTextIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export const MakeStudyPlanMessage = <
  T extends ToolUIPart<Pick<StudyUITools, ToolName.makeStudyPlan>>,
>({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: T;
  addToolResult?: TAddStudyUIToolResult;
}) => {
  const t = useTranslations("StudyPage.ChatBox");
  const { studyUserChat, replay } = useStudyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planContent = toolInvocation.input?.planContent ?? "";
  const locale = toolInvocation.input?.locale ?? "zh-CN";
  const kind = toolInvocation.input?.kind ?? "misc";
  const role = toolInvocation.input?.role ?? "";
  const topic = toolInvocation.input?.topic ?? "";

  const handleConfirm = useCallback(async () => {
    if (toolInvocation.state !== "input-available" || !addToolResult || !studyUserChat) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Call server action to save analyst
      const result = await saveAnalystFromPlan({
        userChatToken: studyUserChat.token,
        locale,
        kind,
        role,
        topic,
      });

      if (!result.success) throw result;

      // Send addToolResult to continue the conversation
      addToolResult({
        tool: ToolName.makeStudyPlan,
        toolCallId: toolInvocation.toolCallId,
        output: {
          confirmed: true,
          plainText: t("researchPlanConfirmed"),
        },
      });

      setIsSubmitting(false);
    } catch (error) {
      toast.error(`Error confirming plan: ${(error as Error).message}`);
      setIsSubmitting(false);
    }
  }, [
    toolInvocation.state,
    toolInvocation.toolCallId,
    addToolResult,
    studyUserChat,
    locale,
    kind,
    role,
    topic,
    t,
  ]);

  const handleCancel = useCallback(() => {
    if (toolInvocation.state === "input-available" && addToolResult) {
      addToolResult({
        tool: ToolName.makeStudyPlan,
        toolCallId: toolInvocation.toolCallId,
        output: {
          confirmed: false,
          plainText: t("researchPlanCancelled"),
        },
      });
    }
  }, [toolInvocation.state, toolInvocation.toolCallId, addToolResult, t]);

  // Show confirmed state
  if (toolInvocation.state === "output-available" || replay) {
    const confirmed =
      toolInvocation.state === "output-available" ? toolInvocation.output.confirmed : false;

    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
        <div className="text-xs text-foreground/80 mb-3 flex items-center justify-between gap-2">
          <span className="font-semibold">{t("researchPlan")}</span>
          <FileTextIcon className="size-4" />
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none mb-3 text-xs">
          <Streamdown>{planContent}</Streamdown>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 text-xs p-2 rounded-md",
            confirmed
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
          )}
        >
          {confirmed ? (
            <>
              <CheckCircle2Icon className="size-4" />
              <span>{t("confirmed")}</span>
            </>
          ) : (
            <>
              <XCircleIcon className="size-4" />
              <span>{t("cancelled")}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Show input streaming state
  if (toolInvocation.state === "input-streaming") {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
        <div className="text-xs text-foreground/80 mb-3 flex items-center justify-between gap-2">
          <span className="font-semibold">{t("researchPlan")}</span>
          <FileTextIcon className="size-4" />
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none mb-3 text-xs">
          <Streamdown isAnimating={true}>{planContent}</Streamdown>
        </div>
        <LoadingPulse />
      </div>
    );
  }

  // Show input-available state with action buttons
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-xs text-foreground/80 mb-3 flex items-center justify-between gap-2">
        <span className="font-semibold">{t("researchPlanConfirmation")}</span>
        <FileTextIcon className="size-4" />
      </div>

      {/* Plan content in markdown */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-xs">
        <Streamdown>{planContent}</Streamdown>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
        <Button
          variant="outline"
          size="sm"
          className="px-6 text-xs"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {t("cancelResearch")}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="px-6 text-xs"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? t("confirming") : t("confirmAndStart")}
        </Button>
      </div>
    </div>
  );
};
