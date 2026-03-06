import { PlainTextUITools } from "@/ai/tools/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DynamicToolUIPart, getToolOrDynamicToolName, ToolUIPart } from "ai";
import { AlertCircleIcon, CheckIcon, ChevronRight, LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ToolArgsTable, { ExpandableText } from "./ToolArgsTable";
import ToolResultTable from "./ToolResultTable";

export type ToolInvocationVariant = "default" | "compact";

export const ToolInvocationMessage = ({
  toolInvocation,
  variant = "default",
}: {
  toolInvocation: DynamicToolUIPart | ToolUIPart<PlainTextUITools>; // 返回 plainText 字段的 tool 都可以使用
  variant?: ToolInvocationVariant;
}) => {
  const [prevState, setPrevState] = useState(toolInvocation.state);
  const [open, setOpen] = useState(
    variant === "compact" ? false : toolInvocation.state !== "output-available",
  );

  useEffect(() => {
    if (prevState !== "output-available" && toolInvocation.state === "output-available") {
      setOpen(false);
      setPrevState(toolInvocation.state);
    }
  }, [toolInvocation.state, prevState]);

  const toolName = getToolOrDynamicToolName(toolInvocation);
  const isDone = toolInvocation.state === "output-available";
  const isError = toolInvocation.state === "output-error";

  const statusIcon = isError ? (
    <AlertCircleIcon className="size-3.5 text-destructive shrink-0" />
  ) : isDone ? (
    <CheckIcon className="size-3.5 text-emerald-500 shrink-0" />
  ) : (
    <LoaderIcon className="size-3.5 animate-spin text-muted-foreground shrink-0" />
  );

  if (variant === "compact") {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-xs font-medium",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors",
          )}
        >
          <ChevronRight
            className={cn(
              "size-3.5 text-muted-foreground transition-transform shrink-0",
              open && "rotate-90",
            )}
          />
          {statusIcon}
          <span className="truncate text-muted-foreground">{toolName}</span>
          {isError && (
            <span className="text-destructive text-[10px] truncate ml-1">
              {toolInvocation.errorText}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-5 pr-2 pb-2">
          <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 p-2 space-y-2 text-xs">
            <div>
              <div className="text-muted-foreground font-medium mb-1">args</div>
              <ToolArgsTable toolInvocation={toolInvocation} />
            </div>
            <div>
              <div className="text-muted-foreground font-medium mb-1">result</div>
              {isDone ? (
                <>
                  <ToolResultTable toolInvocation={toolInvocation} />
                  <div className="mt-1 text-muted-foreground">
                    <ExpandableText
                      text={
                        toolInvocation.type === "dynamic-tool"
                          ? JSON.stringify(toolInvocation.output)
                          : (toolInvocation.output.plainText ?? "")
                      }
                    />
                  </div>
                </>
              ) : isError ? (
                <div className="text-destructive">{toolInvocation.errorText}</div>
              ) : (
                <LoaderIcon className="size-3 animate-spin" />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
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
        <div className="ml-1 my-2 font-bold">exec {toolName}</div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4">
        <div className="ml-1 mt-1 mb-1 text-primary not-dark:font-bold">&gt;_ args</div>
        <ToolArgsTable toolInvocation={toolInvocation} />
        <div className="ml-1 mt-2 mb-2 text-primary not-dark:font-bold">&gt;_ result</div>
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
        ) : toolInvocation.state === "output-error" ? (
          <div className="text-xs p-1 text-red-600">{toolInvocation.errorText}</div>
        ) : (
          <div className="p-1">
            <LoaderIcon className="animate-spin" size={16} />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
