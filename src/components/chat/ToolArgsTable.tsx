import { PlainTextUITools } from "@/ai/tools/types";
import { DynamicToolUIPart, ToolUIPart } from "ai";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export function ExpandableText({ text }: { text: string }) {
  const t = useTranslations("Components.ExpandableText");
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  const displayText = expanded || !isLong ? text : text.substring(0, 200) + "...";

  return (
    <div className="whitespace-pre-wrap break-all">
      {displayText}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-2 cursor-pointer hover:underline text-xs font-bold"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
  );
}

export default function ToolArgsTable({
  toolInvocation,
}: {
  toolInvocation: Omit<DynamicToolUIPart | ToolUIPart<PlainTextUITools>, "type">;
}) {
  const mask = (value: string) => {
    return value; // 方便排查，最近先不 mask 了
    // const keep = value.length >= 6 ? 2 : 1;
    // const partialMaskedValue = value.substring(0, keep) + "***" + value.slice(-keep);
    // return partialMaskedValue;
  };
  const maskedArgs = useMemo<[string, unknown][]>(() => {
    // 如果设置 toolCallStreaming，在状态是 partial-call 的时候，args 是空的
    return Object.entries(toolInvocation.input ?? {}).map(([key, value]) => {
      if (/(id|ids|token|key)$/.test(key)) {
        if (Array.isArray(value)) {
          const val = value.map((v) => mask(`${v}`));
          return [key, val];
        } else {
          const val = mask(`${value}`);
          return [key, val];
        }
      }
      return [key, value];
    });
  }, [toolInvocation.input]);
  return (
    <table className="text-left not-dark:text-muted-foreground">
      <tbody>
        {maskedArgs.map(([key, value]) => (
          <tr key={key}>
            <td className="p-1 align-top">{key}:</td>
            <td className="p-1">
              <ExpandableText
                text={typeof value === "object" ? JSON.stringify(value) : (value?.toString() ?? "")}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
