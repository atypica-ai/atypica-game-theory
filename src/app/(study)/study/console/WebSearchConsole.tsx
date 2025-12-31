import { StudyUITools, ToolName } from "@/ai/tools/types";
import { ToolUIPart } from "ai";

import {
  ExternalLinkIcon,
  ListIcon,
  LoaderIcon,
  MessageSquareIcon,
  SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FC } from "react";
import { Streamdown } from "streamdown";

export const WebSearchConsole: FC<{
  toolInvocation: ToolUIPart<Pick<StudyUITools, ToolName.webSearch>>;
}> = ({ toolInvocation }) => {
  const t = useTranslations("Components.WebSearchResultMessage");

  return (
    <div className="text-sm">
      <div className="mt-2 mb-3 flex flex-rows items-center justify-start gap-2">
        <SearchIcon className="size-3 shrink-0 mt-0.5" />
        <div className="text-foreground/80">{t("searchQuery")}:</div>
        <div className="flex-1 font-medium overflow-hidden">{toolInvocation.input?.query}</div>
      </div>

      {toolInvocation.state === "input-streaming" || toolInvocation.state === "input-available" ? (
        <>
          <LoaderIcon className="animate-spin" size={16} />
        </>
      ) : toolInvocation.state === "output-available" ? (
        <>
          {toolInvocation.output.answer && (
            <div className="flex flex-rows items-start justify-start gap-2 mb-2">
              <MessageSquareIcon className="size-3 shrink-0 mt-0.5" />
              <div className="flex-1 overflow-hidden">
                <div className="leading-3 text-foreground/80 mb-2">{t("summary")}:</div>
                <Streamdown>{toolInvocation.output.answer}</Streamdown>
              </div>
            </div>
          )}

          {toolInvocation.output.results && toolInvocation.output.results.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-rows items-center justify-start gap-2 mb-1">
                <ListIcon className="size-3 shrink-0 mt-0.5" />
                <h4 className="text-sm text-foreground/80">{t("searchResults")}</h4>
              </div>
              {toolInvocation.output.results.map((result, index) => (
                <div
                  key={index}
                  className="border border-zinc-200 dark:border-zinc-600 rounded-md p-2"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <ExternalLinkIcon className="size-3 text-zinc-500 shrink-0 mt-1" />
                    <div className="flex-1 overflow-hidden truncate">
                      <Link
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600/70 dark:text-blue-400/80 hover:underline"
                      >
                        {result.title}
                      </Link>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {result.url}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
