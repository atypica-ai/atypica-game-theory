import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
// 给 chat 类型的 tool call 用的组件，比如 scout chat 和 interview chat
import { cn } from "@/lib/utils";
import { isToolUIPart } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode, useCallback } from "react";
import { Streamdown } from "streamdown";

const PlainText = ({ children }: PropsWithChildren) => {
  return (
    <div className="text-sm flex flex-col gap-4">
      <Streamdown mode="static">{children as string}</Streamdown>
    </div>
  );
};

export const StreamSteps = <UI_MESSAGE extends TMessageWithPlainTextTool>({
  avatar,
  nickname,
  message: { role, parts },
  renderToolUIPart,
}: {
  avatar?: ReactNode;
  nickname?: string;
  message: Pick<UI_MESSAGE, "role" | "parts">;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
}) => {
  const renderedParts = useCallback(
    (parts: UI_MESSAGE["parts"]) => {
      return (
        <div className={cn("flex flex-col gap-4")}>
          {parts.map((part, i) => {
            // 小红书搜索任务之类的，是多个 step 一起显示，搜索结果和总结，所以需要显示超过1条在一起，更好
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
                  {renderToolUIPart(part)}
                </React.Fragment>
              );
            } else if (isToolUIPart(part)) {
              return (
                <React.Fragment key={i}>
                  <ToolInvocationMessage toolInvocation={part} />
                  {renderToolUIPart(part)}
                </React.Fragment>
              );
            } else {
              return null;
            }
          })}
        </div>
      );
    },
    [renderToolUIPart],
  );

  return (
    <motion.div
      className={cn("flex flex-col w-full")}
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div
        className={cn(
          "mb-2 flex gap-2 justify-start items-center shrink-0",
          role === "user" ? "flex-row-reverse" : "flex-row",
        )}
      >
        {role === "user"
          ? avatar || <UserIcon className="size-6" />
          : role === "assistant"
            ? avatar || <BotIcon className="size-6" />
            : role === "system"
              ? avatar || <CpuIcon className="size-6" />
              : null}
        {nickname && (
          <div className="leading-6 text-zinc-800 dark:text-zinc-200 text-sm font-medium">
            {nickname}
          </div>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden", // 需要 overflow-hidden 以防止很长的内容溢出
          role === "user"
            ? "not-dark:bg-blue-50/50 dark:border dark:border-primary/90 pr-2 py-4 pl-4 rounded-lg"
            : role === "system"
              ? "bg-green-50/50 dark:bg-zinc-800 p-4 rounded-lg"
              : "",
        )}
      >
        {renderedParts(parts)}
      </div>
    </motion.div>
  );
};
