import { PlainTextUITools } from "@/ai/tools/types";
import { DynamicToolUIPart, ToolUIPart } from "ai";
import { ExpandableText } from "./ToolArgsTable";

export default function ToolResultTable({
  toolInvocation,
}: {
  toolInvocation: Omit<
    Extract<DynamicToolUIPart | ToolUIPart<PlainTextUITools>, { state: "output-available" }>,
    "type"
  >;
}) {
  return (
    <table className="text-left not-dark:text-muted-foreground">
      <tbody>
        {Object.entries(toolInvocation.output ?? {})
          .filter(([key]) => key !== "plainText")
          .map(([key, value]) => (
            <tr key={key}>
              <td className="p-1 align-top">{key}:</td>
              <td className="p-1">
                <ExpandableText
                  text={
                    typeof value === "object" ? JSON.stringify(value) : (value?.toString() ?? "")
                  }
                />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
