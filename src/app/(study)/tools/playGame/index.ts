import "server-only";

import { AgentToolConfigArgs } from "@/ai/tools/types";
import { runGameSession } from "@/app/(game-theory)/lib";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import { GameSessionExtra, RoundResultEvent } from "@/app/(game-theory)/types";
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
      "Run a game theory game with multiple personas as players. Each player is a persona with a distinct personality that shapes their strategy. Games have defined rules, action constraints, and mathematical payoff functions. Available game types: prisoner-dilemma (2 players, no discussion), stag-hunt (4–10 players, 1 discussion round, collective action threshold game).",
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

        // Load persona names upfront — used for initial extra AND for the summary
        const personas = await prisma.persona.findMany({
          where: { id: { in: personaIds } },
          select: { id: true, name: true },
        });
        const nameMap = new Map(personas.map((p) => [p.id, p.name]));

        const initialExtra: GameSessionExtra = {
          gameType,
          participants: personaIds.map((id) => ({
            personaId: id,
            name: nameMap.get(id) ?? `Persona ${id}`,
          })),
        };

        // Create GameSession record with participants pre-populated so the frontend
        // can show player names immediately without waiting for the first orchestration save
        await prisma.gameSession.create({
          data: {
            token: gameSessionToken,
            gameType,
            personaIds,
            timeline: [],
            status: "pending",
            extra: initialExtra as object,
          },
        });

        // Run the game — orchestration saves timeline after each player's action
        const timeline = await runGameSession({
          gameSessionToken,
          locale,
          abortSignal,
          statReport,
          logger: gameLogger,
        });

        // Derive cumulative payoffs from round-result events
        const cumulativePayoffs: Record<number, number> = {};
        for (const event of timeline) {
          if (event.type === "round-result") {
            const e = event as RoundResultEvent;
            for (const [id, v] of Object.entries(e.payoffs)) {
              const numId = Number(id);
              cumulativePayoffs[numId] = (cumulativePayoffs[numId] ?? 0) + v;
            }
          }
        }

        const totalRounds = timeline.filter((e) => e.type === "round-result").length;

        const payoffSummary = personaIds
          .map((id) => `${nameMap.get(id) ?? `Persona ${id}`}: ${cumulativePayoffs[id] ?? 0}`)
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
