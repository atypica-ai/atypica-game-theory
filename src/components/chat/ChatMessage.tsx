"use client";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { Message as MessageType } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode } from "react";
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
  nickname?: string;
  role: "assistant" | "user" | "system" | "data";
  avatar?: Partial<{ user: ReactNode; assistant: ReactNode; system: ReactNode }>;
  content: string | ReactNode;
  parts?: MessageType["parts"];
}) => {
  const { nickname, role, avatar, content, parts } = message;

  return (
    <motion.div
      className={cn(
        "flex flex-row items-start justify-start gap-2 p-4 w-full first-of-type:mt-2 rounded-sm",
        role === "user" ? "bg-zinc-100/70 dark:bg-zinc-800" : "",
      )}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className={cn("flex flex-rot items-center gap-2 flex-shrink-0")}>
        {role === "user"
          ? avatar?.user || <UserIcon className="size-6 text-blue-500 dark:text-zinc-200" />
          : role === "assistant"
            ? avatar?.assistant || <BotIcon className="size-6 text-gray-500 dark:text-zinc-200" />
            : role === "system"
              ? avatar?.system || <CpuIcon className="size-6 text-green-500 dark:text-zinc-200" />
              : null}
      </div>

      <div className={cn("flex-1 overflow-hidden flex flex-col gap-4 px-1")}>
        {nickname && (
          <div className="leading-[24px] text-zinc-800 dark:text-zinc-200 text-sm font-medium">
            {nickname}
          </div>
        )}
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
