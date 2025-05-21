import { PlainTextToolResult } from "@/ai/tools/types";

export interface InterviewChatResult extends PlainTextToolResult {
  // interviews: {
  //   analystId: number;
  //   persona: {
  //     id: number;
  //     name: string;
  //   };
  //   // personaId: number;
  //   // personaName: string;
  //   // conclusion?: string;  // 不再返回 conclusion，study agent 用不到
  //   result: string;
  // }[];
  plainText: string;
}
