import { isSystemMessage } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { cn } from "@/lib/utils";
import { isToolUIPart } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { ReactNode, useMemo } from "react";
import { Streamdown } from "streamdown";
import { UniversalToolInvocationMessage } from "./UniversalToolInvocationMessage";

/**
 * Extended ChatMessage for Universal Agent.
 * Adds tool invocation filtering and message footer rendering
 * for sub-agent task cards.
 */
export const UniversalChatMessage = <UI_MESSAGE extends TMessageWithPlainTextTool>({
  nickname,
  avatar,
  message: { role, parts },
  renderToolUIPart,
  hideToolInvocations,
  shouldShowToolInvocation,
  renderMessageFooter,
  // extra,
}: {
  nickname?: string;
  avatar?: ReactNode;
  message: Pick<UI_MESSAGE, "role" | "parts">;
  extra?: Omit<UI_MESSAGE, "id" | "role" | "parts">;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
  hideToolInvocations?: boolean;
  shouldShowToolInvocation?: (toolPart: UI_MESSAGE["parts"][number]) => boolean;
  renderMessageFooter?: (message: Pick<UI_MESSAGE, "role" | "parts">) => ReactNode;
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
          const showToolInvocation = shouldShowToolInvocation
            ? shouldShowToolInvocation(part as UI_MESSAGE["parts"][number])
            : !hideToolInvocations;
          if (part.type === "text") {
            return !isSystemMessage(part.text) ? (
              <div key={i} className="text-sm">
                <Streamdown
                  mode={part.state === "streaming" ? "streaming" : "static"}
                  isAnimating={part.state === "streaming"}
                >
                  {part.text}
                </Streamdown>
              </div>
            ) : null;
          } else if (part.type === "reasoning") {
            return (
              <Reasoning
                key={i}
                className="w-full"
                isStreaming={part.state == "streaming"}
                defaultOpen={part.state == "streaming"}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          } else if (part.type === "dynamic-tool") {
            // 通过 MCP 添加的 Tools 会是 dynamic-tools
            return (
              <React.Fragment key={i}>
                {showToolInvocation ? (
                  <UniversalToolInvocationMessage toolInvocation={part} />
                ) : null}
              </React.Fragment>
            );
          } else if (isToolUIPart(part)) {
            return (
              <React.Fragment key={i}>
                {showToolInvocation ? (
                  <UniversalToolInvocationMessage toolInvocation={part} />
                ) : null}
                {/*<ToolInvocationDisplay toolInvocation={part} />*/}
                {renderToolUIPart(part)}
              </React.Fragment>
            );
          } else if (part.type === "step-start" || part.type === "file") {
            // file 在上面显示了，这里直接跳过
            return null;
          } else {
            return (
              <div key={i} className="text-xs text-muted-foreground break-all">
                {JSON.stringify(part)}
              </div>
            );
          }
        })}
        {renderMessageFooter ? renderMessageFooter({ role, parts }) : null}
      </div>
    </motion.div>
  );
};
