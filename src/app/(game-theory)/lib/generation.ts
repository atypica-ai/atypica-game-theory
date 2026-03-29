import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { personaAgentSystem } from "@/app/(persona)/prompt/personaAgent";
import { Persona } from "@/prisma/client";
import { generateText, stepCountIs, tool, zodSchema } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession } from "../types";

// ── Action tool ─────────────────────────────────────────────────────────────

/**
 * Build the action tool for a game type.
 * Players MUST call this tool exactly once per round to submit their decision.
 */
export function buildActionTool(gameType: GameType) {
  return tool({
    description: `Submit your decision for this round. You MUST call this tool exactly once. Think carefully about your strategy before acting.`,
    inputSchema: zodSchema(gameType.actionSchema),
    execute: async (input) => input,
  });
}

// ── Discussion generation ────────────────────────────────────────────────────

/**
 * Generate a player's free-form discussion message for the current round.
 * No tool is offered — the model produces plain text.
 * Reasoning is captured from the model's native reasoning output (null if unsupported).
 */
export async function generatePlayerDiscussion({
  personaSession,
  formattedContext,
  round,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  personaSession: GamePersonaSession;
  formattedContext: string;
  round: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ reasoning: string | null; content: string }> {
  const task =
    locale === "zh-CN"
      ? `这是第 ${round} 轮的讨论阶段。你可以自由表达你的想法、意图或策略考量。其他玩家可以看到你说的内容（但看不到你的内部推理）。`
      : `This is the discussion phase for round ${round}. You may freely express your thoughts, intentions, or strategic considerations. Other players will see what you say (but not your internal reasoning).`;

  logger.info({ msg: "Calling LLM for discussion", personaId: personaSession.personaId, round });

  const { text, reasoning, usage, providerMetadata } = await generateText({
    model: llm("gemini-3-flash"),
    providerOptions: defaultProviderOptions(),
    system: personaSession.systemPrompt,
    messages: [{ role: "user", content: `${formattedContext}\n\n---\n\n${task}` }],
    stopWhen: stepCountIs(1),
    temperature: 0.7,
    abortSignal,
  });

  logger.info({ msg: "LLM returned for discussion", personaId: personaSession.personaId, round });

  const { tokens, extra } = calculateStepTokensUsage({ usage, providerMetadata });
  logger.info({
    msg: "Player discussion generated",
    personaId: personaSession.personaId,
    round,
    ...extra,
  });
  await statReport("tokens", tokens, {
    reportedBy: "playGame",
    step: "player-discussion",
    personaId: personaSession.personaId,
    round,
    ...extra,
  });

  return {
    reasoning: reasoning?.map((r) => r.text).join("\n") || null,
    content: text,
  };
}

// ── Decision generation ──────────────────────────────────────────────────────

/**
 * Generate a player's constrained game-theory decision for the current round.
 * Forces the model to call the action tool exactly once.
 * Reasoning is captured from the model's native reasoning output (null if unsupported).
 */
export async function generatePlayerDecision({
  personaSession,
  gameType,
  formattedContext,
  round,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  personaSession: GamePersonaSession;
  gameType: GameType;
  formattedContext: string;
  round: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ reasoning: string | null; content: Record<string, unknown> }> {
  const actionTool = buildActionTool(gameType);

  const task =
    locale === "zh-CN"
      ? `这是第 ${round} 轮。请仔细阅读上面的游戏状态，思考你的策略，然后通过调用行动工具提交你的决策。你必须调用行动工具一次。`
      : `This is round ${round}. Carefully read the game state above, consider your strategy, then submit your decision by calling the action tool. You MUST call the action tool exactly once.`;

  const { steps, reasoning, usage, providerMetadata } = await generateText({
    model: llm("gemini-3-flash"),
    providerOptions: defaultProviderOptions(),
    system: personaSession.systemPrompt,
    messages: [{ role: "user", content: `${formattedContext}\n\n---\n\n${task}` }],
    tools: { submitAction: actionTool },
    toolChoice: "required",
    stopWhen: stepCountIs(2),
    temperature: 0.7,
    abortSignal,
  });

  const toolInput = steps
    .flatMap((s) => s.toolCalls)
    .find((tc) => tc.toolName === "submitAction")?.input as Record<string, unknown> | undefined;

  if (!toolInput) {
    throw new Error(
      `Persona ${personaSession.personaId} did not call the action tool in round ${round}`,
    );
  }

  const { tokens, extra } = calculateStepTokensUsage({ usage, providerMetadata });
  logger.info({
    msg: "Player decision generated",
    personaId: personaSession.personaId,
    round,
    decision: toolInput,
    ...extra,
  });
  await statReport("tokens", tokens, {
    reportedBy: "playGame",
    step: "player-decision",
    personaId: personaSession.personaId,
    round,
    ...extra,
  });

  return {
    reasoning: reasoning?.map((r) => r.text).join("\n") || null,
    content: toolInput,
  };
}

// ── Persona session builder ──────────────────────────────────────────────────

/**
 * Build a GamePersonaSession from a Persona record.
 * The system prompt retains the persona's character but scopes the task to game play.
 */
export function buildGamePersonaSession({
  persona,
  locale,
}: {
  persona: Persona;
  locale: Locale;
}): GamePersonaSession {
  return {
    personaId: persona.id,
    personaName: persona.name,
    systemPrompt: personaAgentSystem({ persona, locale }),
  };
}
