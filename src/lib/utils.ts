import { generateId, Message, StepResult, ToolInvocation, ToolSet } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fixChatMessages(
  messages: Message[],
  options: {
    removePendingTool?: boolean;
  } = {},
) {
  let fixed = messages.map((message) => {
    if (!message.parts) {
      return message;
    }
    const parts = message.parts.filter((part) => {
      if (part.type === "tool-invocation") {
        // 如果不是 result，一定是执行了一半挂了，丢弃
        if (options.removePendingTool) {
          return part.toolInvocation.state === "result";
        } else {
          return true;
        }
      } else if (part.type === "text") {
        return part.text.trim();
      } else {
        return true;
      }
    });
    return { ...message, parts };
  });

  if (
    fixed.length > 1 &&
    fixed[fixed.length - 2].role === "user" &&
    fixed[fixed.length - 1].role === "user"
  ) {
    // 如果最后 2 条都是 user，一定是之前聊了一半挂了，丢掉最后一条
    fixed = fixed.slice(0, -1);
  }

  if (
    fixed.length > 1 &&
    fixed[fixed.length - 1].role === "assistant" &&
    !fixed[fixed.length - 1].parts?.length &&
    !fixed[fixed.length - 1].content.trim()
  ) {
    // Bedrock 不支持最后一条空的 assistant 消息
    fixed = fixed.slice(0, -1);
  }

  return fixed;
}

export function streamStepsToUIMessage<T extends ToolSet>(
  steps: StepResult<T>[],
): Omit<Message, "role"> {
  const parts: Message["parts"] = [];
  const contents = [];
  for (const step of steps) {
    // 这三步其实是可以合并的
    if (step.stepType === "initial") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    } else if (step.stepType === "continue") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    } else if (step.stepType === "tool-result") {
      contents.push(step.text);
      parts.push({ type: "text", text: step.text });
    }
    // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
    // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
    for (const toolCall of step.toolCalls) {
      let toolInvocation: ToolInvocation = {
        state: "call",
        toolName: toolCall.toolName,
        args: toolCall.args,
        toolCallId: toolCall.toolCallId,
      };
      const toolResult = step.toolResults.find((r) => r.toolCallId === toolInvocation.toolCallId);
      if (toolResult) {
        toolInvocation = {
          state: "result",
          toolName: toolResult.toolName,
          args: toolResult.args,
          toolCallId: toolCall.toolCallId,
          result: toolResult.result,
        };
      }
      parts.push({
        type: "tool-invocation",
        toolInvocation,
      });
    }
  }
  return {
    id: generateId(),
    content: contents.join("\n"),
    parts,
  };
}

export function appendStreamStepToUIMessage<T extends ToolSet>(
  message: Omit<Message, "role">,
  step: StepResult<T>,
) {
  const parts: Message["parts"] = message.parts ?? [];
  const contents = [message.content ?? ""];
  // 这三步其实是可以合并的
  if (step.stepType === "initial") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  } else if (step.stepType === "continue") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  } else if (step.stepType === "tool-result") {
    contents.push(step.text);
    parts.push({ type: "text", text: step.text });
  }
  // 不管是哪个 step，都有可能有 toolCalls，所以要放在外面。
  // 另外，text part 要放在 toolCalls part 的前面，规则是这样的，先文本再执行。
  for (const toolCall of step.toolCalls) {
    let toolInvocation: ToolInvocation = {
      state: "call",
      toolName: toolCall.toolName,
      args: toolCall.args,
      toolCallId: toolCall.toolCallId,
    };
    const toolResult = step.toolResults.find((r) => r.toolCallId === toolInvocation.toolCallId);
    if (toolResult) {
      toolInvocation = {
        state: "result",
        toolName: toolResult.toolName,
        args: toolResult.args,
        toolCallId: toolCall.toolCallId,
        result: toolResult.result,
      };
    }
    parts.push({
      type: "tool-invocation",
      toolInvocation,
    });
  }
  message.content = contents.join("\n");
  message.parts = parts;
}

export const generateToken = (length = 16) =>
  Array(length)
    .fill(0)
    .map(
      () => "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346792"[Math.floor(Math.random() * 51)],
    )
    .join("");

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// Format duration in milliseconds to human-readable format
export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};
