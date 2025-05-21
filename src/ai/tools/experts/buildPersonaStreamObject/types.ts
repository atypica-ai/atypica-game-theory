import { PlainTextToolResult } from "@/ai/tools/types";

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: {
    personaId: number;
    name: string;
    tags: string[];
    source: string;
  }[];
  plainText: string;
}
