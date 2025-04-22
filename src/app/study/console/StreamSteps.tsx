"use client";
import { ToolInvocationDisplay } from "@/components/chat/ToolInvocationDisplay";
import { ToolInvocationMessage } from "@/components/chat/ToolInvocationMessage";
// 给 chat 类型的 tool call 用的组件，比如 scout chat 和 interview chat
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { Message as MessageType } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, UserIcon } from "lucide-react";
import React, { PropsWithChildren, ReactNode, useCallback } from "react";

const PlainText = ({ children }: PropsWithChildren) => {
  return (
    <div className="text-sm flex flex-col gap-4">
      <Markdown>{children as string}</Markdown>
    </div>
  );
};

export const StreamSteps = ({
  avatar,
  nickname,
  role,
  content,
  parts,
}: {
  avatar?: Partial<{ user: ReactNode; assistant: ReactNode; system: ReactNode }>;
  nickname?: string;
  role: "assistant" | "user" | "system" | "data";
  content: string | ReactNode;
  parts?: MessageType["parts"];
}) => {
  const renderedParts = useCallback((parts: NonNullable<MessageType["parts"]>) => {
    return (
      <div className={cn("flex flex-col gap-4")}>
        {parts.map((part, i) => {
          // 小红书搜索任务之类的，是多个 step 一起显示，搜索结果和总结，所以需要显示超过1条在一起，更好
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
        })}
      </div>
    );
  }, []);

  return (
    <motion.div
      className={cn("flex flex-col w-full")}
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div
        className={cn(
          "mb-2 flex gap-2 justify-start items-center flex-shrink-0",
          role === "user" ? "flex-row-reverse" : "flex-row",
        )}
      >
        {role === "user"
          ? avatar?.user || <UserIcon className="size-6" />
          : role === "assistant"
            ? avatar?.assistant || <BotIcon className="size-6" />
            : role === "system"
              ? avatar?.system || <CpuIcon className="size-6" />
              : null}
        {nickname && (
          <div className="leading-[24px] text-zinc-800 dark:text-zinc-200 text-sm font-medium">
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
        {parts ? renderedParts(parts) : <PlainText>{content}</PlainText>}
      </div>
    </motion.div>
  );
};
