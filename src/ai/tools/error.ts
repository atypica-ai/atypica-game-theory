import { rootLogger } from "@/lib/logging";
import {
  generateObject,
  InvalidArgumentError,
  NoSuchToolError,
  tool,
  ToolCallRepairFunction,
  ToolSet,
} from "ai";
import { z } from "zod/v3";
import { llm } from "../provider";

export const handleToolCallError: ToolCallRepairFunction<ToolSet> = async <T extends ToolSet>(
  ...[{ toolCall, tools, error }]: Parameters<ToolCallRepairFunction<T>>
) => {
  let plainText = `Failed to execute tool "${toolCall.toolName}" with parameters ${toolCall.input}: ${error.message}`;
  if (InvalidArgumentError.isInstance(error)) {
    try {
      const { object } = await generateObject({
        model: llm("gpt-4.1-nano"),
        prompt: `Fix the invalid arguments for tool "${toolCall.toolName}". The original parameters were \n\n${toolCall.input}\n\n but they caused an error: ${error.message}. Generate a corrected JSON object that matches the expected schema.`,
        schema: tools[toolCall.toolName].inputSchema,
      });
      rootLogger.info({
        msg: `Fixed args for tool "${toolCall.toolName}"`,
        args: toolCall.input,
        fixedArgs: JSON.stringify(object),
      });
      return { ...toolCall, args: JSON.stringify(object) };
    } catch (error) {
      rootLogger.error(`Failed to generate object: ${(error as Error).message}`);
    }
    plainText = `Invalid arguments provided for tool "${toolCall.toolName}" with parameters ${toolCall.input}: ${error.message}`;
  } else if (NoSuchToolError.isInstance(error)) {
    const availableTools = Object.keys(tools).filter((toolName) => toolName !== "toolCallError");
    plainText = `Tool "${toolCall.toolName}" is not available. Please use only the tools provided to you: ${availableTools.join(", ")}`;
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
  inputSchema: z.object({
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
