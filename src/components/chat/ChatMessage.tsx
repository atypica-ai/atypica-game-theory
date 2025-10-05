"use client";
import { TMessageWithTool } from "@/components/chat/types";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";
import { FileAttachment } from "./FileAttachment";
import { ToolInvocationDisplay } from "./ToolInvocationDisplay";
import { ToolInvocationMessage } from "./ToolInvocationMessage";

const PlainText = ({ children }: PropsWithChildren) => {
  return children ? (
    <div className="text-sm">
      <Markdown>{children as string}</Markdown>
    </div>
  ) : null;
};

export const ChatMessage = ({
  nickname,
  message: { role, parts },
  avatar,
  // extra,
}: {
  message: Pick<TMessageWithTool, "role" | "parts">;
  nickname?: string;
  avatar?: ReactNode;
  extra?: Omit<TMessageWithTool, "id" | "role" | "parts">;
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
        <div className="leading-[24px] text-zinc-800 dark:text-zinc-200 text-sm font-medium">
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
            // 为下面的 else if 条件分支排除 dynamic tool
            return <PlainText key={i}>{part.toolName}</PlainText>;
          } else if (part.type.startsWith("tool-") && "toolCallId" in part) {
            return (
              <React.Fragment key={i}>
                <ToolInvocationMessage toolInvocation={part} />
                <ToolInvocationDisplay toolInvocation={part} />
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
