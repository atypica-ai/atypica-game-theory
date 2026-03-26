import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { personaAgentSystem } from "@/app/(persona)/prompt/personaAgent";
import { Persona } from "@/prisma/client";
import { generateText, stepCountIs, tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod/v3";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession, GameSessionTimeline, PlayerRecord } from "../types";
import { formatTimelineForPlayer } from "./formatting";

/**
 * Build the action tool for a single game session from the game type's action schema.
 * Players MUST call this tool exactly once per round.
 */
function buildActionTool<A extends z.ZodTypeAny>(gameType: GameType<A>) {
  return tool({
    description: `Submit your action for this round. You MUST call this tool exactly once. Think carefully about your strategy before acting.`,
    parameters: gameType.actionSchema,
    execute: async (input) => input,
  });
}

/**
 * Generate a single player's move for a round.
 * Forces the persona to call the action tool exactly once.
 * Captures thoughts (reasoning text), words (pre-action speech), and the action tool call.
 */
export async function generatePlayerMove({
  personaSession,
  gameType,
  timeline,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  personaSession: GamePersonaSession;
  gameType: GameType;
  timeline: GameSessionTimeline;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<PlayerRecord> {
  const actionTool = buildActionTool(gameType);

  const formattedTimeline = formatTimelineForPlayer(timeline, personaSession.playerId, {
    hideCurrentRound: gameType.simultaneousReveal,
  });

  const roundNumber = timeline.rounds.length;
  const task =
    locale === "zh-CN"
      ? `这是第 ${roundNumber} 轮。请仔细阅读上面的游戏状态，思考你的策略，然后通过调用行动工具提交你的决策。你必须调用行动工具一次。`
      : `This is round ${roundNumber}. Carefully read the game state above, consider your strategy, then submit your decision by calling the action tool. You MUST call the action tool exactly once.`;

  const { steps, usage, providerMetadata } = await generateText({
    model: llm("claude-sonnet-4"),
    providerOptions: defaultProviderOptions(),
    system: personaSession.systemPrompt,
    messages: [
      {
        role: "user",
        content: `${formattedTimeline}\n\n---\n\n${task}`,
      },
    ],
    tools: { submitAction: actionTool },
    toolChoice: "required",
    stopWhen: stepCountIs(2),
    temperature: 0.7,
    abortSignal,
  });

  // Collect all text across steps as "words" (visible speech before the action)
  const words = steps
    .flatMap((s) => s.text)
    .join("")
    .trim() || null;

  // Collect tool call inputs as actions
  const actions = steps
    .flatMap((s) => s.toolCalls)
    .filter((tc) => tc.toolName === "submitAction")
    .map((tc) => tc.input as Record<string, unknown>);

  // Report token usage
  const { tokens, extra } = calculateStepTokensUsage({ usage, providerMetadata });
  logger.info({
    msg: "Player move generated",
    playerId: personaSession.playerId,
    personaId: personaSession.personaId,
    actions,
    ...extra,
  });
  await statReport("tokens", tokens, {
    reportedBy: "playGame",
    step: "player-move",
    playerId: personaSession.playerId,
    personaId: personaSession.personaId,
    ...extra,
  });

  return {
    thoughts: null, // reasoning is internal to the model; we don't expose it
    words,
    actions,
  };
}

/**
 * Build a GamePersonaSession from a Persona and game metadata.
 * The system prompt retains the persona's character but replaces the interview task with a game task.
 */
export function buildGamePersonaSession({
  persona,
  playerId,
  locale,
}: {
  persona: Persona;
  playerId: string;
  locale: Locale;
}): GamePersonaSession {
  return {
    personaId: persona.id,
    personaName: persona.name,
    playerId,
    systemPrompt: personaAgentSystem({ persona, locale }),
  };
}
