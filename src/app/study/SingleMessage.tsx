import ToolArgsTable, { ExpandableText } from "@/components/chat/ToolArgsTable";
import { TAddToolResult, ToolInvocationDisplay } from "@/components/chat/ToolInvocationDisplay";
import ToolResultTable from "@/components/chat/ToolResultTable";
import { Markdown } from "@/components/markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CONTINUE_ASSISTANT_STEPS } from "@/lib/messageUtils";
import { cn } from "@/lib/utils";
import { PlainTextToolResult } from "@/tools/utils";
import { Message, Message as MessageType, ToolInvocation } from "ai";
import { motion } from "framer-motion";
import { BotIcon, ChevronRight, EyeIcon, LoaderIcon, XIcon } from "lucide-react";
import { PropsWithChildren, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useStudyContext } from "./hooks/StudyContext";

const ToolInvocationMessage = ({
  toolInvocation,
  addToolResult,
  isLastToolPart,
}: {
  toolInvocation: ToolInvocation;
  addToolResult: TAddToolResult;
  isLastToolPart?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { setViewToolInvocation, setLastToolInvocation, setConsoleOpen } = useStudyContext();

  useEffect(() => {
    if (isLastToolPart) {
      setLastToolInvocation(toolInvocation);
    }
  }, [toolInvocation, setLastToolInvocation, isLastToolPart]);

  const prevIsLastPartRef = useRef(isLastToolPart);
  useEffect(() => {
    if (isLastToolPart) {
      setOpen(true);
    } else if (prevIsLastPartRef.current && !isLastToolPart) {
      setOpen(false);
    }
  }, [isLastToolPart]);

  return (
    <>
      <Collapsible
        className={cn(
          "text-xs font-mono rounded-lg p-2",
          "bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50",
        )}
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger className="w-full flex items-center gap-1 hover:opacity-90 group">
          <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90 text-primary" />
          <div className="ml-1 my-2 font-bold text-xs text-primary">
            exec {toolInvocation.toolName}
          </div>
          <div
            className="text-foreground/70 ml-auto mr-2 p-2 hover:bg-zinc-100 hover:dark:bg-zinc-900 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              setViewToolInvocation(toolInvocation);
              setConsoleOpen(true);
            }}
          >
            <EyeIcon className="size-3.5" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4">
          <div className="ml-1 mt-1 mb-1 text-primary not-dark:font-bold">&gt;_ args</div>
          <ToolArgsTable toolInvocation={toolInvocation} />
          <div className="ml-1 mt-2 mb-1 text-primary not-dark:font-bold">&gt;_ result</div>
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
        </CollapsibleContent>
      </Collapsible>
      <ToolInvocationDisplay toolInvocation={toolInvocation} addToolResult={addToolResult} />
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

export const SingleMessage = ({
  message: { role, content, parts },
  addToolResult,
  avatar,
  nickname,
  onDelete,
  isLastMessage,
}: {
  // role: "assistant" | "user" | "system" | "data";
  // content: string | ReactNode;
  // parts?: MessageType["parts"];
  message: Message;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: PlainTextToolResult;
  }) => void;
  avatar?: Partial<{ user: ReactNode; assistant: ReactNode; system: ReactNode }>;
  nickname?: string;
  onDelete?: () => void;
  isLastMessage?: boolean;
}) => {
  const renderUserMessage = useCallback(() => {
    const contentLength = (content?.toString() ?? "").length;
    return (
      <div
        className={cn(
          "w-full mt-8 mb-6 flex items-center justify-between",
          "not-first-of-type:border-t not-first-of-type:border-zinc-100 not-first-of-type:dark:border-zinc-700/50 not-first-of-type:pt-12",
        )}
      >
        <span
          className={cn(
            contentLength < 20
              ? "text-2xl"
              : contentLength < 50
                ? "text-xl"
                : contentLength < 80
                  ? "text-lg"
                  : contentLength < 100
                    ? "text-base"
                    : "text-sm",
            "font-medium whitespace-pre-wrap",
          )}
        >
          {content}
        </span>
        {onDelete ? (
          <div
            className="p-2 text-muted-foreground hover:text-muted-foreground/50 mr-4"
            onClick={() => onDelete()}
          >
            <XIcon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
    );
  }, [content, onDelete]);

  // const { replay } = useStudyContext();
  const renderParts = (parts: NonNullable<MessageType["parts"]>) => {
    // if (replay) {
    //   parts = parts.filter(
    //     (part) =>
    //       !(
    //         part.type === "tool-invocation" &&
    //         part.toolInvocation.toolName === ToolName.requestPayment
    //       ) && !(part.type === "text" && part.text.includes("免费研究额度已经用完")),
    //   );
    // }
    const lastToolPartIndex = parts.findLastIndex((part) => part.type === "tool-invocation");
    return (
      <div className="flex flex-col gap-4">
        {parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return <PlainText key={i}>{part.text}</PlainText>;
            case "reasoning":
              return <PlainText key={i}>{part.reasoning}</PlainText>;
            case "source":
              return <PlainText key={i}>{JSON.stringify(part.source)}</PlainText>;
            case "tool-invocation":
              return (
                <ToolInvocationMessage
                  key={i}
                  toolInvocation={part.toolInvocation}
                  isLastToolPart={isLastMessage && i === lastToolPartIndex}
                  addToolResult={addToolResult}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  if (role === "user") {
    if (content !== CONTINUE_ASSISTANT_STEPS) {
      return renderUserMessage();
    }
  } else if (role === "assistant") {
    return (
      <motion.div
        className={cn("sm:flex sm:flex-row sm:gap-2 w-full")}
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-4">{avatar?.assistant || <BotIcon className="size-6" />}</div>
        <div className="sm:flex-1 overflow-hidden">
          {nickname && (
            <div className="leading-[32px] text-zinc-800 dark:text-zinc-200 text-sm font-medium">
              {nickname}
            </div>
          )}
          {parts ? renderParts(parts) : <PlainText>{content}</PlainText>}
        </div>
      </motion.div>
    );
  } else {
    return null;
  }
};
