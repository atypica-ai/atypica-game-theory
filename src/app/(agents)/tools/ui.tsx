import { TAddStudyUIToolResult } from "@/ai/tools/types";
import { ToolUIPart } from "ai";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { ThanksToolInput, ThanksToolResult, TSimpleAgentMessageWithTool } from "./types";

export const ThanksMessage = <
  T extends ToolUIPart<{
    thanks: {
      input: ThanksToolInput;
      output: ThanksToolResult;
    };
  }>,
>(
  {
    // toolInvocation,
    // addToolResult,
  }: {
    toolInvocation: T;
    addToolResult?: TAddStudyUIToolResult;
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

export const SimpleAgentToolUIPartDisplay = ({
  toolUIPart,
  // addToolResult,
}: {
  toolUIPart: TSimpleAgentMessageWithTool["parts"][number];
  addToolResult?: TAddStudyUIToolResult;
}) => {
  if (!("toolCallId" in toolUIPart)) {
    return null;
  }

  switch (toolUIPart.type) {
    case `tool-thanks`:
      return <ThanksMessage toolInvocation={toolUIPart} />;
  }

  if (toolUIPart.state !== "output-available") {
    return null;
  }

  switch (toolUIPart.type) {
    default:
      return null;
  }
};
