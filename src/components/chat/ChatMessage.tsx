"use client";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { ToolName } from "@/tools";
import {
  DYPostCommentsResultMessage,
  DYSearchResultMessage,
  DYUserPostsResultMessage,
} from "@/tools/dy/ToolMessage";
import { ReasoningThinkingResultMessage } from "@/tools/experts/ToolMessage";
import {
  SaveAnalystToolResultMessage,
  SaveInterviewConclusionMessage,
} from "@/tools/system/ToolMessage";
import { ThanksMessage } from "@/tools/user/ToolMessage";
import {
  XHSNoteCommentsResultMessage,
  XHSSearchResultMessage,
  XHSUserNotesResultMessage,
} from "@/tools/xhs/ToolMessage";
import { Message as MessageType, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { BotIcon, CpuIcon, LoaderIcon, UserIcon } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";
import ToolArgsTable, { ExpandableText } from "./ToolArgsTable";
import ToolResultTable from "./ToolResultTable";

// const renderResult = (toolInvocation: ToolInvocation & { state: "result" }) => {
const SpecialToolDisplay = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  switch (toolInvocation.toolName) {
    case ToolName.saveInterviewConclusion:
      return <SaveInterviewConclusionMessage toolInvocation={toolInvocation} />;
    case ToolName.thanks:
      return <ThanksMessage toolInvocation={toolInvocation} />;
  }
  if (toolInvocation.state !== "result") {
    return null;
  }
  switch (toolInvocation.toolName) {
    case ToolName.xhsSearch:
      return <XHSSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.xhsUserNotes:
      return <XHSUserNotesResultMessage toolInvocation={toolInvocation} />;
    case ToolName.xhsNoteComments:
      return <XHSNoteCommentsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dySearch:
      return <DYSearchResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dyUserPosts:
      return <DYUserPostsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.dyPostComments:
      return <DYPostCommentsResultMessage toolInvocation={toolInvocation} />;
    case ToolName.reasoningThinking:
      return <ReasoningThinkingResultMessage toolInvocation={toolInvocation} />;
    case ToolName.saveAnalyst:
      return <SaveAnalystToolResultMessage toolInvocation={toolInvocation} />;
    default:
      return (
        <pre
          className={cn(
            "text-xs font-mono p-4",
            "text-zinc-800 bg-zinc-100 dark:text-zinc-200 dark:bg-zinc-800",
            "border border-zinc-200 dark:border-zinc-700 rounded-lg",
          )}
        >
          {toolInvocation.result.plainText ?? "-"}
        </pre>
      );
  }
};

const ToolInvocationMessage = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  return (
    <>
      <div className={cn("text-xs whitespace-pre-wrap font-mono")}>
        <div className="ml-1 my-2 font-bold">exec {toolInvocation.toolName}</div>
        <div className="ml-1 mt-1 mb-1 text-primary not-dark:font-bold">&gt;_ args</div>
        <ToolArgsTable toolInvocation={toolInvocation} />
        <div className="ml-1 mt-2 mb-2 text-primary not-dark:font-bold">&gt;_ result</div>
        {toolInvocation.state === "result" ? (
          <>
            <ToolResultTable toolInvocation={toolInvocation} />
            <div className="ml-1 mt-2 mb-1 text-primary not-dark:font-bold">&gt;_ message</div>
            <div className="text-xs p-1 not-dark:text-muted-foreground">
              <ExpandableText text={toolInvocation.result.plainText} />
            </div>
          </>
        ) : (
          <div className="p-1">
            <LoaderIcon className="animate-spin" size={16} />
          </div>
        )}
      </div>
      <SpecialToolDisplay toolInvocation={toolInvocation} />
    </>
  );
};

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
  environment?: "console" | "chat";
}) => {
  const { nickname, role, avatar, content, parts, environment = "chat" } = message;

  return (
    <motion.div
      className={cn(
        "flex flex-row items-start justify-start gap-2 p-4 w-full first-of-type:mt-2 rounded-sm",
        role === "user" ? "bg-zinc-100/70 dark:bg-zinc-800" : "",
        environment === "console" ? "flex-col" : "",
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

      <div className={cn("flex flex-col gap-4 overflow-hidden px-1")}>
        {nickname && (
          <div className="leading-[24px] text-zinc-800 dark:text-zinc-200 text-sm font-medium">
            {nickname}
          </div>
        )}
        {parts ? (
          (environment === "console" ? parts.slice(-1) : parts).map((part, i) => {
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
          })
        ) : (
          <PlainText>{content}</PlainText>
        )}
      </div>
    </motion.div>
  );
};
