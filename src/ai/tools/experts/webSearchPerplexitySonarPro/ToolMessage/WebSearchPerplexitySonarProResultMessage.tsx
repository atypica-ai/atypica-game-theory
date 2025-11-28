import { StudyUITools, ToolName } from "@/ai/tools/types";
import { Markdown } from "@/components/markdown";
import { ToolUIPart } from "ai";
import { ExternalLinkIcon, ListIcon, MessageSquareIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface WebSearchPerplexitySonarProResultMessageProps {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.webSearchPerplexitySonarPro>>,
    { state: "output-available" }
  >;
}

export function WebSearchPerplexitySonarProResultMessage({
  toolInvocation,
}: WebSearchPerplexitySonarProResultMessageProps) {
  const t = useTranslations("Components.WebSearchResultMessage");

  return (
    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-xs max-h-dvh overflow-y-auto scrollbar-thin">
      <div className="mt-2 mb-3 flex flex-rows items-center justify-start gap-2">
        <SearchIcon className="size-3 shrink-0 mt-0.5" />
        <div className="text-foreground/80">Perplexity Search Query:</div>
        <div className="flex-1 font-medium overflow-hidden">{toolInvocation.input.query}</div>
      </div>

      {toolInvocation.output.answer && (
        <div className="flex flex-rows items-start justify-start gap-2 mb-2">
          <MessageSquareIcon className="size-3 shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden">
            <div className="leading-3 text-foreground/80 mb-1">Perplexity Answer:</div>
            <div className="text-xs leading-4">
              <Markdown>{toolInvocation.output.answer}</Markdown>
            </div>
          </div>
        </div>
      )}

      {toolInvocation.output.results && toolInvocation.output.results.length > 0 && (
        <div className="flex flex-rows items-start justify-start gap-2 mb-2">
          <ListIcon className="size-3 shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden">
            <div className="leading-3 text-foreground/80 mb-1">Search Results:</div>
            <div className="space-y-1">
              {toolInvocation.output.results.map((result, index) => (
                <div key={index} className="text-xs leading-4">
                  <div className="flex items-start gap-1">
                    <ExternalLinkIcon className="size-3 shrink-0 mt-0.5" />
                    <Link
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline line-clamp-1"
                    >
                      {result.title}
                    </Link>
                  </div>
                  {result.content && (
                    <div className="text-xs text-muted-foreground line-clamp-2 ml-4">
                      {result.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toolInvocation.output.sources && toolInvocation.output.sources.length > 0 && (
        <div className="flex flex-rows items-start justify-start gap-2">
          <ListIcon className="size-3 shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden">
            <div className="leading-3 text-foreground/80 mb-1">Sources:</div>
            <div className="space-y-1">
              {toolInvocation.output.sources.map((source, index) => (
                <div key={index} className="text-xs leading-4">
                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <Link
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline line-clamp-1"
                    >
                      {source.title || source.url}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
