import { WebSearchToolResult } from "@/ai/tools/experts/webSearch/types";
import { Markdown } from "@/components/markdown";
import { ToolInvocation } from "ai";
import { ExternalLinkIcon, MessageSquareIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { FC } from "react";

export const WebSearchResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: WebSearchToolResult;
  };
}> = ({ toolInvocation }) => {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs">
      <div className="mt-2 mb-4 font-medium flex flex-rows items-start justify-start gap-2">
        <SearchIcon className="size-4 shrink-0" />
        <div className="leading-4 flex-1 overflow-hidden">{toolInvocation.args.query}</div>
      </div>

      {toolInvocation.result.answer && (
        <div className="flex flex-rows items-start justify-start gap-2 mb-6">
          <MessageSquareIcon className="size-4 shrink-0" />
          <div className="leading-4 flex-1 overflow-hidden">
            <Markdown>{toolInvocation.result.answer}</Markdown>
          </div>
        </div>
      )}

      {toolInvocation.result.results && toolInvocation.result.results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">搜索结果</h4>
          {toolInvocation.result.results.map((result, index) => (
            <div
              key={index}
              className="border border-zinc-200 dark:border-zinc-600 rounded-md p-3 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-start gap-2 mb-2">
                <ExternalLinkIcon className="size-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline block truncate"
                  >
                    {result.title}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                    {result.url}
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                {result.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
