import { GameType } from "./types";
import { prisonerDilemma } from "./prisonerDilemma";

// Registry of all available game types
// Key must match GameType.name
export const gameTypeRegistry: Record<string, GameType> = {
  [prisonerDilemma.name]: prisonerDilemma,
};

export function getGameType(name: string): GameType {
  const gt = gameTypeRegistry[name];
  if (!gt) {
    throw new Error(
      `Unknown game type: "${name}". Available: ${Object.keys(gameTypeRegistry).join(", ")}`,
    );
  }
  return gt;
}

export { prisonerDilemma };
