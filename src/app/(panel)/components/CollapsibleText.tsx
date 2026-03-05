"use client";
import { getDisplayWidth } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "next-intl";
import { type ReactNode, useState } from "react";

/**
 * Collapsible text component.
 *
 * When the text's display width exceeds `maxDisplayWidth`, it shows a trimmed
 * plain-text preview with an expand button. When expanded (or when the text is
 * short enough), it renders the `children` node (e.g. <Streamdown>).
 *
 * @param text - raw text content, used for display-width measurement
 * @param maxDisplayWidth - threshold in display-width units (CJK=2, ASCII=1), default 300
 * @param children - the rich rendered content shown when expanded
 */
export function CollapsibleText({
  text,
  maxDisplayWidth = 300,
  children,
  className,
}: {
  text: string;
  maxDisplayWidth?: number;
  children: ReactNode;
  className?: string;
}) {
  const locale = useLocale();
  const isZh = locale === "zh-CN";
  const [expanded, setExpanded] = useState(false);
  const isLong = getDisplayWidth(text) > maxDisplayWidth;

  if (!isLong) {
    return <div className={className}>{children}</div>;
  }

  if (expanded) {
    return (
      <div className={className}>
        {children}
        <button
          onClick={() => setExpanded(false)}
          className="pr-2 py-1 mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronUp className="size-3" />
          {isZh ? "收起" : "Show less"}
        </button>
      </div>
    );
  }

  // Collapsed: show trimmed plain text
  const trimmed = text.replace(/\n/g, " ").trim();

  return (
    <div className={className}>
      <p className={cn("text-sm leading-relaxed line-clamp-4")}>{trimmed}</p>
      <button
        onClick={() => setExpanded(true)}
        className="pr-2 py-1 mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className="size-3" />
        {isZh ? "展开" : "Show more"}
      </button>
    </div>
  );
}
