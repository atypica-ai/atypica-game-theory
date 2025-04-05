import { ToolInvocation } from "ai";
import { ExpandableText } from "./ToolArgsTable";

export default function ToolResultTable({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation & { state: "result" };
}) {
  return (
    <table className="text-left">
      <tbody>
        {Object.entries(toolInvocation.result)
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
