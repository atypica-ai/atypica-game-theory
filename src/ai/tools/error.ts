import { getDeployRegion } from "@/lib/request/deployRegion";
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
  let plainText = `Failed to execute tool "${toolCall.toolName}" with parameters ${JSON.stringify(toolCall.args)}: ${error.message}`;
  if (NoSuchToolError.isInstance(error)) {
    const availableTools = Object.keys(tools).filter((toolName) => toolName !== "toolCallError");
    plainText =
      getDeployRegion() === "mainland"
        ? `目前无法使用 ${toolCall.toolName} 工具，请确保使用目前提供给你的工具: ${availableTools.join(", ")}`
        : `Tool "${toolCall.toolName}" is not available. Please use only the tools provided to you: ${availableTools.join(", ")}`;
  } else if (InvalidToolArgumentsError.isInstance(error)) {
    plainText = `Invalid arguments provided for tool "${toolCall.toolName}" with parameters ${JSON.stringify(toolCall.args)}: ${error.message}`;
  }
  return {
    ...toolCall,
    toolName: "toolCallError",
    args: JSON.stringify({ plainText }),
  };
};

export const toolCallError = tool({
  description:
    "System tool for reporting tool execution errors. This tool is automatically invoked and should not be used directly",
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
//     description: "Used to indicate tool call limit has been reached",
//     parameters: limitedTool.parameters,
//     execute: async ({}) => {
//       return { plainText };
//     },
//   }) as T;
// }
