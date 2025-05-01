import { getDeployRegion } from "@/lib/deployRegion";
import {
  InvalidToolArgumentsError,
  NoSuchToolError,
  tool,
  ToolCallRepairFunction,
  ToolSet,
} from "ai";
import { z } from "zod";

export const handleToolCallError: ToolCallRepairFunction<ToolSet> = async <T extends ToolSet>(
  ...[{ toolCall, tools, error }]: Parameters<ToolCallRepairFunction<T>>
) => {
  let plainText = `Failed to call tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}: ${error.message}`;
  if (NoSuchToolError.isInstance(error)) {
    const availableTools = Object.keys(tools).filter((toolName) => toolName !== "toolCallError");
    plainText =
      getDeployRegion() === "mainland"
        ? `目前无法使用 ${toolCall.toolName} 工具，请确保使用目前提供给你的工具: ${availableTools.join(", ")}`
        : `Failed to call tool ${toolCall.toolName}, please make sure you are using the tools provided to you: ${availableTools.join(", ")}`;
  } else if (InvalidToolArgumentsError.isInstance(error)) {
    plainText = `Invalid arguments for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}: ${error.message}`;
  }
  return {
    ...toolCall,
    toolName: "toolCallError",
    args: JSON.stringify({ plainText }),
  };
};

export const toolCallError = tool({
  description: "用于提示工具调用错误，请不要主动使用这个工具",
  parameters: z.object({
    plainText: z.string(),
  }),
  execute: async ({ plainText }) => {
    return { plainText };
  },
});

// export function toolCallLimited<T extends Tool>({
//   plainText,
//   limitedTool,
// }: {
//   plainText: string;
//   limitedTool: T;
// }) {
//   return tool({
//     description: "用于提示工具调用调用达到上限",
//     parameters: limitedTool.parameters,
//     execute: async ({}) => {
//       return { plainText };
//     },
//   }) as T;
// }
