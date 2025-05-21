import { PlainTextToolResult } from "@/ai/tools/types";

export type TPersonaForStudy = {
  personaId: number;
  name: string;
  tags: string[];
  source: string;
};

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: TPersonaForStudy[];
  plainText: string;
}
