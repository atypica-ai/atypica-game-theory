import { UIToolConfigs } from "@/ai/tools/types";

import { UIDataTypes, UIMessage } from "ai";

export type TMessageWithTool = UIMessage<unknown, UIDataTypes, UIToolConfigs>;

// ⚠️ 把 ToolUIPart<X> 里面的 X 取出来，比如大部分地方使用的定义在 ai/tools/types.ts 里的 UIToolConfigs
// type InferUIMessageTools<T extends ToolUIPart> =
//   T extends ToolUIPart<infer TOOLS> ? TOOLS : UITools;

export type TAddToolResult = <TOOL extends keyof UIToolConfigs>({
  state,
  tool,
  toolCallId,
  output,
  errorText,
}:
  | {
      state?: "output-available";
      tool: TOOL;
      toolCallId: string;
      output: UIToolConfigs[TOOL]["output"];
      errorText?: never;
    }
  | {
      state: "output-error";
      tool: TOOL;
      toolCallId: string;
      output?: never;
      errorText: string;
    }) => Promise<void>;
