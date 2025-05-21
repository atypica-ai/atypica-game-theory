import { PlainTextToolResult, TPersonaForStudy } from "@/ai/tools/types";

export interface SearchPersonasToolResult extends PlainTextToolResult {
  personas: TPersonaForStudy[];
  plainText: string;
}
