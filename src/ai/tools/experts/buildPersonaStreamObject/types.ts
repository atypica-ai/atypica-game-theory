import { PlainTextToolResult } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { z } from "zod";

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: {
    personaId: number;
    name: string;
    tags: string[];
    source: string;
  }[];
  plainText: string;
}

export const personaBuildSchemaStreamObject = () =>
  z.object({
    name: z.string().describe("名字，不要包含姓氏，使用网名").transform(fixMalformedUnicodeString),
    source: z.string().describe("数据来源").transform(fixMalformedUnicodeString),
    // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
    tags: z
      .array(z.string())
      .describe("用户标签，3-5个特征标签")
      .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
    personaPrompt: z
      .string()
      .describe("模拟用户画像的智能体的系统提示词，300到500字")
      .transform(fixMalformedUnicodeString),
  });
