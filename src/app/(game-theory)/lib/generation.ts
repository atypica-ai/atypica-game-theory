import "server-only";

import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { gamePersonaAgentSystem } from "@/app/(persona)/prompt/gamePersonaAgent";
import { Persona } from "@/prisma/client";
import { generateText, stepCountIs, tool, zodSchema } from "ai";
import { Logger } from "pino";
import z from "zod/v3";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession } from "../types";

// ── Discussion tool ──────────────────────────────────────────────────────────

const discussionSchema = z.object({
  reasoning: z
    .string()
    .describe("Your private strategic thoughts before speaking. NOT shown to other players."),
  message: z
    .string()
    .describe("Your message to other players. Keep it to 3 sentences or fewer."),
});

export const discussionTool = tool({
  description: `Say something to the other players this discussion round. You MUST call this tool exactly once.`,
  inputSchema: zodSchema(discussionSchema),
  execute: async (input) => input,
});

// ── Action tool ─────────────────────────────────────────────────────────────

/**
 * Build the action tool for a game type.
 * Prepends a private `reasoning` field (not stored in game content) so the model
 * can think through its strategy before committing to an action.
 */
export function buildActionTool(gameType: GameType) {
  const extendedSchema = z.object({
    reasoning: z
      .string()
      .describe("Your private strategic reasoning before deciding. NOT shown to other players."),
    ...(gameType.actionSchema as z.ZodObject<z.ZodRawShape>).shape,
  });
  return tool({
    description: `Submit your decision for this round. You MUST call this tool exactly once.`,
    inputSchema: zodSchema(extendedSchema),
    execute: async (input) => input,
  });
}

// ── Discussion generation ────────────────────────────────────────────────────

/**
 * Generate a player's discussion message for the current round via tool call.
 * The tool's `reasoning` field is private (stored in event reasoning, not content).
 * The tool's `message` field is the public statement shown to other players.
 */
export async function generatePlayerDiscussion({
  personaSession,
  formattedContext,
  round,
  abortSignal,
  statReport,
  logger,
}: {
  personaSession: GamePersonaSession;
  formattedContext: string;
  round: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ reasoning: string | null; content: string }> {
  const task = `This is the discussion phase for round ${round}. Call the discussion tool once: first write your private reasoning, then your message to the other players (3 sentences or fewer).`;

  logger.info({ msg: "Calling LLM for discussion", personaId: personaSession.personaId, round });

  const { steps, usage, providerMetadata } = await generateText({
    model: llm(personaSession.modelName),
    providerOptions: defaultProviderOptions(),
    system: personaSession.systemPrompt,
    messages: [{ role: "user", content: `${formattedContext}\n\n---\n\n${task}` }],
    tools: { speak: discussionTool },
    toolChoice: "required",
    stopWhen: stepCountIs(2),
    temperature: 0.7,
    abortSignal,
  });

  logger.info({ msg: "LLM returned for discussion", personaId: personaSession.personaId, round });

  const toolInput = steps
    .flatMap((s) => s.toolCalls)
    .find((tc) => tc.toolName === "speak")?.input as { reasoning: string; message: string } | undefined;

  if (!toolInput) {
    throw new Error(
      `Persona ${personaSession.personaId} did not call the speak tool in round ${round}`,
    );
  }

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
    reasoning: toolInput.reasoning || null,
    content: toolInput.message,
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
  abortSignal,
  statReport,
  logger,
}: {
  personaSession: GamePersonaSession;
  gameType: GameType;
  formattedContext: string;
  round: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ reasoning: string | null; content: Record<string, unknown> }> {
  const actionTool = buildActionTool(gameType);

  const task = `This is round ${round}. Carefully read the game state above, consider your strategy, then submit your decision by calling the action tool. You MUST call the action tool exactly once.`;

  const { steps, reasoning, usage, providerMetadata } = await generateText({
    model: llm(personaSession.modelName),
    providerOptions: defaultProviderOptions(),
    system: personaSession.systemPrompt,
    messages: [{ role: "user", content: `${formattedContext}\n\n---\n\n${task}` }],
    tools: { submitAction: actionTool },
    toolChoice: "required",
    stopWhen: stepCountIs(2),
    temperature: 0.7,
    abortSignal,
  });

  const rawInput = steps
    .flatMap((s) => s.toolCalls)
    .find((tc) => tc.toolName === "submitAction")?.input as Record<string, unknown> | undefined;

  if (!rawInput) {
    throw new Error(
      `Persona ${personaSession.personaId} did not call the action tool in round ${round}`,
    );
  }

  // Strip `reasoning` from content — it's private and must not reach the payoff function.
  const { reasoning: toolReasoning, ...content } = rawInput;

  const { tokens, extra } = calculateStepTokensUsage({ usage, providerMetadata });
  logger.info({
    msg: "Player decision generated",
    personaId: personaSession.personaId,
    round,
    decision: content,
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
    reasoning: (toolReasoning as string) || reasoning?.map((r) => r.text).join("\n") || null,
    content,
  };
}

// ── Persona session builder ──────────────────────────────────────────────────

/**
 * Build a GamePersonaSession from a Persona record.
 * The system prompt retains the persona's character but scopes the task to game play.
 */
export function buildGamePersonaSession({
  persona,
  modelName,
}: {
  persona: Persona;
  modelName: LLMModelName;
}): GamePersonaSession {
  return {
    personaId: persona.id,
    personaName: persona.name,
    systemPrompt: gamePersonaAgentSystem({ persona }),
    modelName,
  };
}
