import { isSystemMessage } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { isToolUIPart } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { ReactNode, useMemo } from "react";
import { FileAttachment } from "./FileAttachment";
import { ToolInvocationMessage } from "./ToolInvocationMessage";

export const ChatMessage = <UI_MESSAGE extends TMessageWithPlainTextTool>({
  nickname,
  avatar,
  message: { role, parts },
  renderToolUIPart,
  // extra,
}: {
  nickname?: string;
  avatar?: ReactNode;
  message: Pick<UI_MESSAGE, "role" | "parts">;
  extra?: Omit<UI_MESSAGE, "id" | "role" | "parts">;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
}) => {
  const fileParts = useMemo(() => {
    return parts?.filter((part) => part.type === "file");
  }, [parts]);

  return (
    <motion.div
      className={cn(
        "p-3 w-full rounded-sm",
        role === "user" ? "bg-zinc-100/70 dark:bg-zinc-800" : "",
      )}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="mb-3 flex flex-row items-center gap-2 shrink-0">
        {role === "user"
          ? avatar || <UserIcon className="size-6 text-blue-500 dark:text-zinc-200" />
          : role === "assistant"
            ? avatar || <BotIcon className="size-6 text-gray-500 dark:text-zinc-200" />
            : role === "system"
              ? avatar || <CpuIcon className="size-6 text-green-500 dark:text-zinc-200" />
              : null}
        <div className="leading-6 text-zinc-800 dark:text-zinc-200 text-sm font-medium">
          {nickname ?? role}
        </div>
      </div>
      {fileParts && (
        <div className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto">
          {fileParts.map((attachment, index) => (
            <FileAttachment key={index} attachment={attachment} />
          ))}
        </div>
      )}
      <div className={cn("flex-1 overflow-hidden flex flex-col gap-3 px-1")}>
        {parts.map((part, i) => {
          if (part.type === "text") {
            return !isSystemMessage(part.text) ? (
              <div key={i} className="text-sm">
                <Markdown>{part.text}</Markdown>
              </div>
            ) : null;
          } else if (part.type === "reasoning") {
            return (
              <div
                key={i}
                className="border-l-2 border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20 pl-3 pr-3 py-2 rounded-r-md"
              >
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 dark:text-blue-400 text-base">💭</span>
                  <div className="flex-1 text-xs text-blue-900/80 dark:text-blue-100/80 italic">
                    <Markdown>{part.text}</Markdown>
                  </div>
                </div>
              </div>
            );
          } else if (part.type === "dynamic-tool") {
            // 通过 MCP 添加的 Tools 会是 dynamic-tools
            return (
              <React.Fragment key={i}>
                <ToolInvocationMessage toolInvocation={part} />
              </React.Fragment>
            );
          } else if (isToolUIPart(part)) {
            return (
              <React.Fragment key={i}>
                <ToolInvocationMessage toolInvocation={part} />
                {/*<ToolInvocationDisplay toolInvocation={part} />*/}
                {renderToolUIPart(part)}
              </React.Fragment>
            );
          } else if (part.type === "step-start") {
            return null;
          } else {
            return (
              <div key={i} className="text-xs text-muted-foreground break-all">
                {JSON.stringify(part)}
              </div>
            );
          }
        })}
      </div>
    </motion.div>
  );
};
