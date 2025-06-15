import { PlainTextToolResult } from "@/ai/tools/types";

export type TPlatform = "小红书" | "抖音" | "TikTok" | "Instagram" | "Twitter";

export interface ScoutTaskChatResult extends PlainTextToolResult {
  personas?: {
    id: number;
    name: string;
    tags: string[];
  }[]; // 历史消息的任务里是有 personas 的，新的没了，不过这个需要长期保留，不做迁移
  stats?: {
    [platform in TPlatform]: number;
  };
  plainText: string;
}
