import { ToolUIPart } from "ai";
import { Streamdown } from "streamdown";
import { PlainTextUITools } from "./types";

export const PlainTextToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<ToolUIPart<PlainTextUITools>, { state: "output-available" }>;
}) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <Streamdown>{toolInvocation.output.plainText}</Streamdown>
    </div>
  );
};
