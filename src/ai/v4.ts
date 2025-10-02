import { ToolUIPart, UIMessage } from "ai";

export type V4ToolInvocation =
  | {
      state: "partial-call";
      toolCallId: string;
      toolName: string;
      args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  | {
      state: "call";
      toolCallId: string;
      toolName: string;
      args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  | {
      state: "result";
      toolCallId: string;
      toolName: string;
      args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      result: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };

export type V4MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; reasoning: string }
  | { type: "tool-invocation"; toolInvocation: V4ToolInvocation };

export type V5MessagePart = UIMessage["parts"][number]; // aka UIMessagePart

export function convertToV5MessagePart(part: V4MessagePart | V5MessagePart): V5MessagePart {
  if (part.type === "text") {
    // v4 和 v5 是一样的, { type:"text", text: string }
    return part;
  } else if (part.type === "reasoning") {
    if ("reasoning" in part) {
      // v4
      return { type: "reasoning", text: part.reasoning };
    } else {
      // v5
      return part;
    }
  } else if (part.type === "tool-invocation" && "toolInvocation" in part) {
    // v4
    const toolInvocation = part.toolInvocation;
    const v5ToolUIPart = {
      type: `tool-${toolInvocation.toolName}`,
      input: toolInvocation.args,
      toolCallId: toolInvocation.toolCallId,
    } as Pick<ToolUIPart, "type" | "input" | "toolCallId">;
    if (toolInvocation.state === "result") {
      return {
        ...v5ToolUIPart,
        state: "output-available",
        output: toolInvocation.result,
      };
    } else if (toolInvocation.state === "call") {
      return {
        ...v5ToolUIPart,
        state: "input-available",
      };
    } else if (toolInvocation.state === "partial-call") {
      return {
        ...v5ToolUIPart,
        state: "input-streaming",
      };
    }
  }

  // 如果前面都不满足，v4 没有其他的可能性了，这个 part 一定是 v5 的
  return part as unknown as V5MessagePart;
}
