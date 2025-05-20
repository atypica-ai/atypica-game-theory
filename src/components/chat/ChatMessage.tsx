"use client";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { Message, Message as MessageType } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode } from "react";
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

export const ChatMessage = (message: {
  role: "assistant" | "user" | "system" | "data";
  nickname?: string;
  avatar?: ReactNode;
  content: string | ReactNode;
  parts?: MessageType["parts"];
  extra?: Omit<Message, "id" | "role" | "content" | "parts">;
}) => {
  const { nickname, role, avatar, content, parts, extra } = message;

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
      {extra?.experimental_attachments && (
        <div className="mb-2 flex flex-wrap gap-2 max-w-full overflow-x-auto">
          {extra?.experimental_attachments.map((attachment, index) => (
            <FileAttachment key={index} attachment={attachment} />
          ))}
        </div>
      )}

      <div className={cn("flex-1 overflow-hidden flex flex-col gap-3 px-1")}>
        {parts ? (
          parts.map((part, i) => {
            // 如果是控制台环境，只显示最后一条
            switch (part.type) {
              case "text":
                return <PlainText key={i}>{part.text}</PlainText>;
              case "reasoning":
                return <PlainText key={i}>{part.reasoning}</PlainText>;
              case "source":
                return <PlainText key={i}>{JSON.stringify(part.source)}</PlainText>;
              case "tool-invocation":
                return (
                  <React.Fragment key={i}>
                    <ToolInvocationMessage toolInvocation={part.toolInvocation} />
                    <ToolInvocationDisplay toolInvocation={part.toolInvocation} />
                  </React.Fragment>
                );
              default:
                return null;
            }
          })
        ) : (
          <PlainText>{content}</PlainText>
        )}
      </div>
    </motion.div>
  );
};
