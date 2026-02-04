import { PlainTextUITools } from "@/ai/tools/types";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { LoaderIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { useFormatContent } from "./useFormatContent";

export const FormattedContentToolResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<ToolUIPart<PlainTextUITools>, { state: "output-available" }>;
}) => {
  const { replay } = useStudyContext();
  const hasCalledRef = useRef(false);

  const {
    formattedHtml,
    isLoading: isFormatting,
    formatContent,
    stop,
  } = useFormatContent({
    live: !replay,
  });

  useEffect(() => {
    // 防止 React Strict Mode 重复调用
    if (hasCalledRef.current) {
      return;
    }

    const plainText = toolInvocation.output.plainText;
    if (plainText) {
      hasCalledRef.current = true;
      formatContent(plainText);
    }

    return () => {
      // cleanup 时停止正在进行的请求
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.toolCallId]);

  return (
    <div
      className={cn(
        "p-2 rounded-lg border border-zinc-100 dark:border-zinc-700",
        "text-xs space-y-2",
      )}
    >
      <div className="">
        {/* Formatted HTML Content */}
        {isFormatting && (
          <div className="flex items-center gap-2 text-blue-600">
            <LoaderIcon className="animate-spin" size={14} />
            <span>formatting</span>
          </div>
        )}
        {formattedHtml ? (
          <div
            className="formatted-audience-feedback prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : (
          !isFormatting && (
            <Streamdown
              mode="static" // static 模式可以大大提升渲染速度
              parseIncompleteMarkdown={false}
              isAnimating={false}
              cdnUrl={null}
            >
              {toolInvocation.output.plainText}
            </Streamdown>
          )
        )}
      </div>
    </div>
  );
};
