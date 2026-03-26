import { GameType } from "./types";
import { prisonerDilemma } from "./prisonerDilemma";

// Registry of all available game types.
// Stored without a base-type annotation so TypeScript retains each entry's concrete generic.
// Key must match GameType.name.
export const gameTypeRegistry = {
  [prisonerDilemma.name]: prisonerDilemma,
};

export function getGameType(name: string): GameType {
  const gt = (gameTypeRegistry as unknown as Record<string, GameType>)[name];
  if (!gt) {
    throw new Error(
      `Unknown game type: "${name}". Available: ${Object.keys(gameTypeRegistry).join(", ")}`,
    );
  }
  return gt;
}

export { prisonerDilemma };
