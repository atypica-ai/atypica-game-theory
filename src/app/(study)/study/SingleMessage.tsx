import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { StudyUITools, TStudyMessageWithTool } from "@/ai/tools/types";
import { FileAttachment } from "@/components/chat/FileAttachment";
import ToolArgsTable, { ExpandableText } from "@/components/chat/ToolArgsTable";
import ToolResultTable from "@/components/chat/ToolResultTable";
import { Markdown } from "@/components/markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  DynamicToolUIPart,
  getToolOrDynamicToolName,
  isToolOrDynamicToolUIPart,
  isToolUIPart,
  ToolUIPart,
} from "ai";
import { motion } from "framer-motion";
import { BotIcon, ChevronRight, EyeIcon, LoaderIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStudyContext } from "./hooks/StudyContext";

const ToolInvocationMessage = <UI_MESSAGE extends TStudyMessageWithTool>({
  toolInvocation,
  // addToolResult,
  renderToolUIPart,
  isLastToolPart,
}: {
  toolInvocation: DynamicToolUIPart | ToolUIPart<StudyUITools>;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
  isLastToolPart?: boolean;
}) => {
  const t = useTranslations("StudyPage.SingleMessage");
  const [open, setOpen] = useState(false);
  const {
    setViewToolInvocation,
    // setLastToolInvocation,
    setConsoleOpen,
  } = useStudyContext();

  // useEffect(() => {
  //   if (isLastToolPart) {
  //     setLastToolInvocation(toolInvocation);
  //   }
  // }, [toolInvocation, setLastToolInvocation, isLastToolPart]);

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
        data-tool-call-id={
          isToolOrDynamicToolUIPart(toolInvocation) ? toolInvocation.toolCallId : undefined
        }
        className={cn(
          "text-xs font-mono rounded-lg p-2",
          "bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50",
        )}
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 hover:opacity-90 group">
          <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90 text-primary" />
          <div className="ml-1 my-2 font-bold text-xs text-primary truncate">
            exec {getToolOrDynamicToolName(toolInvocation)}
          </div>
          <div
            className="shrink-0 text-foreground/70 ml-auto mr-2 p-2 hover:bg-zinc-100 hover:dark:bg-zinc-900 rounded-md flex items-center gap-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setViewToolInvocation(toolInvocation);
              setConsoleOpen(true);
            }}
          >
            <EyeIcon className="size-3.5" />
            {t("viewToolCall")}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4">
          <div className="ml-1 mt-1 mb-1 text-primary not-dark:font-bold">&gt;_ args</div>
          <ToolArgsTable toolInvocation={toolInvocation} />
          <div className="ml-1 mt-2 mb-1 text-primary not-dark:font-bold">&gt;_ result</div>
          {toolInvocation.state === "output-available" ? (
            <>
              <ToolResultTable toolInvocation={toolInvocation} />
              <div className="ml-1 mt-2 mb-1 text-primary not-dark:font-bold">&gt;_ message</div>
              <div className="text-xs p-1 not-dark:text-muted-foreground">
                <ExpandableText
                  text={
                    toolInvocation.type === "dynamic-tool"
                      ? JSON.stringify(toolInvocation.output)
                      : (toolInvocation.output.plainText ?? "")
                  }
                />
              </div>
            </>
          ) : (
            <div className="p-1">
              <LoaderIcon className="animate-spin" size={16} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      {/*<ToolInvocationDisplay toolInvocation={toolInvocation} addToolResult={addToolResult} />*/}
      {renderToolUIPart(toolInvocation)}
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

export const SingleMessage = <UI_MESSAGE extends TStudyMessageWithTool>({
  message: { role, parts },
  renderToolUIPart,
  avatar,
  nickname,
  onDelete,
  isLastMessage,
  className,
}: {
  // role: "assistant" | "user" | "system" | "data";
  // content: string | ReactNode;
  // parts?: MessageType["parts"];
  message: TStudyMessageWithTool;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
  avatar?: ReactNode;
  nickname?: string;
  onDelete?: () => void;
  isLastMessage?: boolean;
  className?: string;
}) => {
  const fileParts = useMemo(() => {
    return parts?.filter((part) => part.type === "file");
  }, [parts]);

  const renderUserMessage = useCallback(() => {
    // 用户输入的消息（如果有多条，其实不会有）合并在一起显示
    const textContent = parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
    const contentLength = (textContent.toString() ?? "").length;
    if (textContent === CONTINUE_ASSISTANT_STEPS) {
      return null;
    }
    return (
      <div
        className={cn(
          "w-full mt-8 mb-6",
          "not-first-of-type:border-t not-first-of-type:border-zinc-100 not-first-of-type:dark:border-zinc-700/50 not-first-of-type:pt-12",
          className,
        )}
      >
        <div className="w-full flex items-center justify-between">
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
            {textContent}
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
        {fileParts.length ? (
          <div className="mt-4 flex flex-wrap gap-2 max-w-full overflow-x-auto">
            {fileParts.map((attachment, index) => (
              <FileAttachment key={index} attachment={attachment} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }, [parts, onDelete, fileParts, className]);

  // const { replay } = useStudyContext();
  const renderParts = (parts: TStudyMessageWithTool["parts"]) => {
    // if (replay) {
    //   parts = parts.filter(
    //     (part) =>
    //       !(
    //         part.type === "tool-invocation" &&
    //         part.toolInvocation.toolName === ToolName.requestPayment
    //       ) && !(part.type === "text" && part.text.includes("免费研究额度已经用完")),
    //   );
    // }
    const lastToolPartIndex = parts.findLastIndex((part) => isToolOrDynamicToolUIPart(part));
    return (
      <div className="flex flex-col gap-4">
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
              <ToolInvocationMessage
                key={i}
                toolInvocation={part}
                isLastToolPart={isLastMessage && i === lastToolPartIndex}
                // addToolResult={addToolResult}
                renderToolUIPart={renderToolUIPart}
              />
            );
          } else if (isToolUIPart(part)) {
            return (
              <ToolInvocationMessage
                key={i}
                toolInvocation={part}
                isLastToolPart={isLastMessage && i === lastToolPartIndex}
                // addToolResult={addToolResult}
                renderToolUIPart={renderToolUIPart}
              />
            );
          } else {
            return null;
          }
        })}
      </div>
    );
  };

  if (role === "user") {
    return renderUserMessage();
  } else if (role === "assistant") {
    return (
      <motion.div
        className={cn("w-full", className)}
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-4 flex items-center justify-start gap-4">
          {avatar || <BotIcon className="size-6" />}
          {nickname && (
            <div className="leading-8 text-zinc-800 dark:text-zinc-200 text-sm font-medium">
              {nickname}
            </div>
          )}
        </div>
        <div className="sm:flex-1 overflow-hidden">{renderParts(parts)}</div>
      </motion.div>
    );
  } else {
    return null;
  }
};
