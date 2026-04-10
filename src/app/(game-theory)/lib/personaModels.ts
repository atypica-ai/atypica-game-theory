import "server-only";

import { LLMModelName } from "@/ai/provider";

export const GAME_PERSONA_MODELS: LLMModelName[] = [
  "claude-haiku-4-5",
  "gemini-3-flash",
  "gpt-5-mini",
  // 
];

export function assignRandomPersonaModels(
  personaIds: number[],
): Record<number, LLMModelName> {
  return Object.fromEntries(
    personaIds.map((id) => [
      id,
      GAME_PERSONA_MODELS[Math.floor(Math.random() * GAME_PERSONA_MODELS.length)],
    ]),
  );
}
