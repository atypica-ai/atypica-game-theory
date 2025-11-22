import { StudyUITools, TAddStudyUIToolResult, ToolName } from "@/ai/tools/types";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { getUserTokensBalanceAction } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { ToolUIPart } from "ai";
import { CoinsIcon, MessageCircleQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export const RequestPaymentMessage = <
  T extends ToolUIPart<Pick<StudyUITools, ToolName.requestPayment>>,
>({
  toolInvocation,
  // addToolResult,
}: {
  toolInvocation: T;
  addToolResult?: TAddStudyUIToolResult;
}) => {
  const t = useTranslations("StudyPage.RequestPaymentMessage");
  const {
    studyUserChat: { id: studyUserChatId },
  } = useStudyContext();
  const [paymentSuccess, setPaymentSuccess] = useState(false); // toolInvocation.state === "result"

  useEffect(() => {
    if (toolInvocation.state === "output-available") {
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 1000);
      const result = await getUserTokensBalanceAction();
      if (!result.success) {
        throw new Error(result.message);
      }
      const balance = result.data;
      if (balance === "Unlimited" || balance > 0) {
        clearTimeout(timeoutId);
        // 一旦检测到成功了，就可以停下，刷新页面后再次请求 chat 接口会进入 study 流程
        // 没必要再 addToolResult，而且这里有个问题，会不知道什么原因 addToolResult 提交到了刷新页面以后的 study chat 里，这里可能是延迟提交的
        // addToolResult({
        //   toolCallId: toolInvocation.toolCallId,
        //   result: {plainText: "支付成功，额度充足，请继续调研"},
        // });
        setPaymentSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [toolInvocation.state, toolInvocation.toolCallId, studyUserChatId]);

  return !paymentSuccess ? (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-sm text-foreground/80 mb-3 flex items-center justify-start gap-1">
        <strong>{t("outOfQuotaHint")}</strong>
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
        <Link href="/pricing">
          <CoinsIcon className="h-3.5 w-3.5 text-amber-500" />
          {t("addMoreTokens")}
        </Link>
      </Button>
    </div>
  ) : (
    <div className="text-sm">{t("paymentSuccess")}</div>
  );
};
