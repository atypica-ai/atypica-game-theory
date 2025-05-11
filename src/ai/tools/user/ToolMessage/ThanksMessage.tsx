import { ToolInvocation } from "ai";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { FC } from "react";

export const ThanksMessage: FC<{
  toolInvocation: ToolInvocation;
  // addToolResult: ({
  //   toolCallId,
  //   result,
  // }: {
  //   toolCallId: string;
  //   result: RequestInteractionResult;
  // }) => void;
}> = (
  {
    // toolInvocation,
    // addToolResult
  },
) => {
  return (
    <Link href="/" className="text-sm flex items-center gap-2 font-bold">
      <span>🎉 感谢分享</span>
      <LinkIcon className="size-3" />
      <span className="underline">点击此处</span>
      <span>继续和 atypica.AI 对话，提出您的商业研究问题。</span>
    </Link>
  );
};
