import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";
import { LoaderIcon } from "lucide-react";
import ToolArgsTable, { ExpandableText } from "./ToolArgsTable";
import ToolResultTable from "./ToolResultTable";

export const ToolInvocationMessage = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  return (
    <div className={cn("text-xs font-mono")}>
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
  );
};
