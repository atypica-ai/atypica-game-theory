import { PlainTextUITools } from "@/ai/tools/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { ChevronRight, LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ToolArgsTable, { ExpandableText } from "./ToolArgsTable";
import ToolResultTable from "./ToolResultTable";

export const ToolInvocationMessage = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<PlainTextUITools>; // 返回 plainText 字段的 tool 都可以使用
}) => {
  const [prevState, setPrevState] = useState(toolInvocation.state);
  const [open, setOpen] = useState(toolInvocation.state !== "output-available");

  useEffect(() => {
    if (prevState !== "output-available" && toolInvocation.state === "output-available") {
      setOpen(false);
      setPrevState(toolInvocation.state);
    }
  }, [toolInvocation.state, prevState]);

  // dirty way to extract tool name from type
  const toolName = toolInvocation.type.slice(5);

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
              <ExpandableText text={toolInvocation.output.plainText ?? ""} />
            </div>
          </>
        ) : (
          <div className="p-1">
            <LoaderIcon className="animate-spin" size={16} />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
