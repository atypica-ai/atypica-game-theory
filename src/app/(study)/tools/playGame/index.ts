import "server-only";

import { AgentToolConfigArgs } from "@/ai/tools/types";
import { runGameSession } from "@/app/(game-theory)/lib";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { playGameInputSchema, playGameOutputSchema, PlayGameResult } from "./types";

export const playGameTool = ({
  locale,
  abortSignal,
  statReport,
  logger,
}: AgentToolConfigArgs) =>
  tool({
    description:
      "Run a game theory game with multiple personas as players. Each player is a persona with a distinct personality that shapes their strategy. Games have defined rules, action constraints, and mathematical payoff functions. Available game types: prisoner-dilemma.",
    inputSchema: playGameInputSchema,
    outputSchema: playGameOutputSchema,
    toModelOutput: (result) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ gameType, personaIds, gameSessionToken }): Promise<PlayGameResult> => {
      const gameLogger = logger.child({ tool: "playGame", gameType, personaIds, gameSessionToken });

      try {
        // Validate game type exists
        const gt = getGameType(gameType);

        // Validate player count
        if (personaIds.length < gt.minPlayers || personaIds.length > gt.maxPlayers) {
          return {
            gameSessionToken: "",
            plainText: `Game type "${gameType}" requires between ${gt.minPlayers} and ${gt.maxPlayers} players, but ${personaIds.length} were provided.`,
          };
        }

        // Create GameSession record (with empty timeline) so frontend can start polling
        await prisma.gameSession.create({
          data: {
            token: gameSessionToken,
            gameType,
            personaIds,
            timeline: {},
            status: "pending",
            extra: {},
          },
        });

        // Run the game (automatically saves timeline after each player's move)
        const timeline = await runGameSession({
          gameSessionToken,
          locale,
          abortSignal,
          statReport,
          logger: gameLogger,
        });

        // Build summary
        const totalRounds = timeline.rounds.length;
        const cumulativePayoffs: Record<string, number> = {};
        for (const round of timeline.rounds) {
          for (const [pid, v] of Object.entries(round.payoffs)) {
            cumulativePayoffs[pid] = (cumulativePayoffs[pid] ?? 0) + v;
          }
        }

        const payoffSummary = timeline.meta.participants
          .map((p) => `${p.name}: ${cumulativePayoffs[p.playerId] ?? 0}`)
          .join(", ");

        const plainText =
          locale === "zh-CN"
            ? `游戏完成。类型：${gt.displayName}，共 ${totalRounds} 轮，${personaIds.length} 位参与者。\n\n累计收益：${payoffSummary}`
            : `Game completed. Type: ${gt.displayName}, ${totalRounds} rounds, ${personaIds.length} players.\n\nCumulative payoffs: ${payoffSummary}`;

        return { gameSessionToken, plainText };
      } catch (error) {
        gameLogger.error({ msg: "Game session failed", error: (error as Error).message });
        throw error;
      }
    },
  });
