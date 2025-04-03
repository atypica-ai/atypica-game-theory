import { RequestInteractionResult } from "@/tools/user/interaction";
import { ToolInvocation } from "ai";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { FC, useEffect } from "react";
import { useStudyContext } from "../../hooks/StudyContext";

export const ThanksMessage: FC<{
  toolInvocation: ToolInvocation;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: RequestInteractionResult;
  }) => void;
}> = ({
  toolInvocation,
  // addToolResult
}) => {
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
  }, [pendingUserToolInvocation, setPendingUserToolInvocation, toolInvocation]);

  return (
    <div className="p-4">
      <Link href="/" className="text-xs flex items-center gap-2">
        <LinkIcon className="size-3" />
        <span>感谢您的分享，现在你可以点击此处继续和 atypica.AI 对话，提出您的商业研究问题。</span>
      </Link>
    </div>
  );
};
