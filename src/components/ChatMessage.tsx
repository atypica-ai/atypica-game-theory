"use client";

import { cn } from "@/lib/utils";
import { ToolName } from "@/tools";
import {
  DYPostCommentsResultMessage,
  DYSearchResultMessage,
  DYUserPostsResultMessage,
} from "@/tools/dy/ToolMessage";
import { ReasoningThinkingResultMessage } from "@/tools/experts/ToolMessage";
import { SaveAnalystToolResultMessage } from "@/tools/system/ToolMessage";
import {
  XHSNoteCommentsResultMessage,
  XHSSearchResultMessage,
  XHSUserNotesResultMessage,
} from "@/tools/xhs/ToolMessage";
import { Message as MessageType, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, LoaderIcon, UserIcon } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";
import { Markdown } from "./markdown";
import ToolArgsTable from "./ToolArgsTable";

const ToolInvocationMessage = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  const renderResult = (toolInvocation: ToolInvocation & { state: "result" }) => {
    switch (toolInvocation.toolName) {
      case ToolName.xhsSearch:
        return <XHSSearchResultMessage result={toolInvocation.result} />;
      case ToolName.xhsUserNotes:
        return <XHSUserNotesResultMessage result={toolInvocation.result} />;
      case ToolName.xhsNoteComments:
        return <XHSNoteCommentsResultMessage result={toolInvocation.result} />;
      case ToolName.dySearch:
        return <DYSearchResultMessage result={toolInvocation.result} />;
      case ToolName.dyUserPosts:
        return <DYUserPostsResultMessage result={toolInvocation.result} />;
      case ToolName.dyPostComments:
        return <DYPostCommentsResultMessage result={toolInvocation.result} />;
      case ToolName.reasoningThinking:
        return <ReasoningThinkingResultMessage result={toolInvocation.result} />;
      case ToolName.saveAnalyst:
        return <SaveAnalystToolResultMessage result={toolInvocation.result} />;
      default:
        return (
          <pre className="text-xs whitespace-pre-wrap p-4 text-muted-foreground bg-gray-50 border border-gray-100 rounded-lg font-mono">
            {toolInvocation.result.plainText ?? "-"}
          </pre>
        );
    }
  };

  return (
    <div className={cn("text-xs whitespace-pre-wrap font-mono")}>
      <div className="ml-1 my-2 font-bold">exec {toolInvocation.toolName}</div>
      <div className="ml-1 mt-1 mb-1 text-primary not-dark:font-bold">&gt;_ args</div>
      <ToolArgsTable toolInvocation={toolInvocation} />
      <div className="ml-1 mt-2 mb-2 text-primary not-dark:font-bold">&gt;_ result</div>
      {toolInvocation.state === "result" ? (
        renderResult(toolInvocation)
      ) : (
        <div className="p-1">
          <LoaderIcon className="animate-spin" size={16} />
        </div>
      )}
    </div>
  );
};

const PlainText = ({ children }: PropsWithChildren) => {
  return (
    <div className="text-sm text-zinc-800 flex flex-col gap-4">
      <Markdown>{children as string}</Markdown>
    </div>
  );
};

export const ChatMessage = (message: {
  nickname?: string;
  role: "assistant" | "user" | "system" | "data";
  content: string | ReactNode;
  parts?: MessageType["parts"];
  environment?: "console" | "chat";
}) => {
  const { nickname, role, content, parts, environment = "chat" } = message;

  return (
    <motion.div
      className={cn(
        "flex flex-row gap-4 px-4 w-full first-of-type:mt-10 py-4",
        role === "user"
          ? "bg-blue-50/50 border-r-4 border-blue-200 flex-row-reverse"
          : role === "assistant"
            ? "bg-gray-50/50 border-l-4 border-gray-200"
            : role === "system"
              ? "bg-green-50/50 border-l-4 border-green-200"
              : "",
        environment === "console" ? "flex-col border-l-0 border-r-0" : "",
      )}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div
        className={cn(
          "size-[24px] flex flex-col justify-center items-center flex-shrink-0",
          role === "user"
            ? "text-blue-500"
            : role === "assistant"
              ? "text-gray-500"
              : role === "system"
                ? "text-green-500"
                : "",
        )}
      >
        {role === "user" ? (
          <UserIcon />
        ) : role === "assistant" ? (
          <BotIcon />
        ) : role === "system" ? (
          <CpuIcon />
        ) : null}
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-hidden">
        {nickname && (
          <div className="leading-[24px] text-zinc-800 text-sm font-medium">{nickname}</div>
        )}
        {parts ? (
          <div className="flex flex-col gap-4">
            {(environment === "console" ? parts.slice(-1) : parts).map((part, i) => {
              // 如果是控制台环境，只显示最后一条
              switch (part.type) {
                case "text":
                  return <PlainText key={i}>{part.text}</PlainText>;
                case "reasoning":
                  return <PlainText key={i}>{part.reasoning}</PlainText>;
                case "source":
                  return <PlainText key={i}>{JSON.stringify(part.source)}</PlainText>;
                case "tool-invocation":
                  return <ToolInvocationMessage key={i} toolInvocation={part.toolInvocation} />;
                default:
                  return null;
              }
            })}
          </div>
        ) : (
          <PlainText>{content}</PlainText>
        )}
      </div>
    </motion.div>
  );
};
