import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { isToolUIPart } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";
import { FileAttachment } from "./FileAttachment";
import { ToolInvocationMessage } from "./ToolInvocationMessage";

const PlainText = ({ children }: PropsWithChildren) => {
  return children ? (
    <div className="text-sm">
      <Markdown>{children as string}</Markdown>
    </div>
  ) : null;
};

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
            return <PlainText key={i}>{part.text}</PlainText>;
          } else if (part.type === "reasoning") {
            return <PlainText key={i}>{part.text}</PlainText>;
            // } else if (part.type === "source") {
            //   return <PlainText key={i}>{JSON.stringify(part.source)}</PlainText>;
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
          } else {
            return null;
          }
        })}
      </div>
    </motion.div>
  );
};
