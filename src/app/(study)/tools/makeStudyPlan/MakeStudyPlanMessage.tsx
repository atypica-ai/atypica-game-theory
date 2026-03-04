import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools, TAddStudyUIToolResult } from "@/app/(study)/tools/types";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/segment";
import { ToolUIPart } from "ai";
import { CheckIcon, FileTextIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export const MakeStudyPlanMessage = <
  T extends ToolUIPart<Pick<StudyUITools, StudyToolName.makeStudyPlan>>,
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

  const handleConfirm = useCallback(async () => {
    if (toolInvocation.state !== "input-available" || !addToolResult || !studyUserChat) {
      return;
    }

    setIsSubmitting(true);

    try {
      trackEvent("Study Plan Confirmed", { userChatId: studyUserChat.id });
      if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
        // ga event name 不能有空格
        window.gtag("event", "study_plan_confirmed", { userChatId: studyUserChat.id });
      }
    } catch {}

    try {
      // Send addToolResult to continue the conversation
      addToolResult({
        tool: StudyToolName.makeStudyPlan,
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
  }, [toolInvocation.state, toolInvocation.toolCallId, addToolResult, studyUserChat, t]);

  const handleCancel = useCallback(() => {
    if (toolInvocation.state === "input-available" && addToolResult) {
      addToolResult({
        tool: StudyToolName.makeStudyPlan,
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
          <Streamdown mode="static">{planContent}</Streamdown>
        </div>
        <div className="flex items-center gap-2 text-xs pt-3 border-t border-zinc-200 dark:border-zinc-700 text-muted-foreground">
          {confirmed ? (
            <>
              <CheckIcon className="size-3.5 text-green-600 dark:text-green-500" />
              <span>{t("planConfirmedStatus")}</span>
            </>
          ) : (
            <>
              <XIcon className="size-3.5" />
              <span>{t("planCancelledStatus")}</span>
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
          <Streamdown mode="streaming" isAnimating={true}>
            {planContent}
          </Streamdown>
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
        <Streamdown mode="static">{planContent}</Streamdown>
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
