import { GameType } from "./types";
import { prisonerDilemma } from "./prisonerDilemma";
import { stagHunt } from "./stagHunt";
import { beautyContest } from "./beautyContest";
import { goldenBall } from "./goldenBall";
import { allPayAuction } from "./allPayAuction";
import { volunteerDilemma } from "./volunteerDilemma";
import { publicGoods } from "./publicGoods";

// Registry of all available game types.
// Stored without a base-type annotation so TypeScript retains each entry's concrete generic.
// Key must match GameType.name.
export const gameTypeRegistry = {
  [prisonerDilemma.name]: prisonerDilemma,
  [stagHunt.name]: stagHunt,
  [beautyContest.name]: beautyContest,
  [goldenBall.name]: goldenBall,
  [allPayAuction.name]: allPayAuction,
  [volunteerDilemma.name]: volunteerDilemma,
  [publicGoods.name]: publicGoods,
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

export { prisonerDilemma, stagHunt, beautyContest, goldenBall, allPayAuction, volunteerDilemma, publicGoods };
