/**
 * Fixed color palette for game models.
 *
 * Each model in GAME_PERSONA_MODELS maps to a stable color by its index.
 * Up to 10 slots — warm academic tones that work on both light and dark backgrounds.
 * Client-safe (no "server-only").
 */

// ── 10-slot palette ──────────────────────────────────────────────────────────

export const MODEL_PALETTE = [
  "hsl(208 55% 52%)", // steel blue       — slot 0
  "hsl(25  50% 52%)", // sienna            — slot 1
  "hsl(155 35% 46%)", // sage              — slot 2
  "hsl(270 32% 56%)", // lavender          — slot 3
  "hsl(0   40% 52%)", // dusty rose        — slot 4
  "hsl(190 38% 46%)", // teal              — slot 5
  "hsl(45  55% 48%)", // goldenrod         — slot 6
  "hsl(330 40% 52%)", // mauve             — slot 7
  "hsl(100 30% 46%)", // olive             — slot 8
  "hsl(15  60% 44%)", // burnt orange      — slot 9
] as const;

// ── Model registry (must match GAME_PERSONA_MODELS order in personaModels.ts) ─

const MODEL_ORDER: string[] = [
  "claude-haiku-4-5",
  "gemini-3-flash",
  "gpt-4.1-mini",
];

// ── Lookup ───────────────────────────────────────────────────────────────────

const _modelColorMap = new Map<string, string>();
for (let i = 0; i < MODEL_ORDER.length; i++) {
  _modelColorMap.set(MODEL_ORDER[i], MODEL_PALETTE[i % MODEL_PALETTE.length]);
}

/** Get the fixed color for a model name. Falls back to palette cycling for unknown models. */
export function getModelColor(model: string): string {
  const cached = _modelColorMap.get(model);
  if (cached) return cached;

  // Deterministic fallback: hash model name to a palette slot
  let hash = 0;
  for (let i = 0; i < model.length; i++) {
    hash = ((hash << 5) - hash + model.charCodeAt(i)) | 0;
  }
  const color = MODEL_PALETTE[Math.abs(hash) % MODEL_PALETTE.length];
  _modelColorMap.set(model, color);
  return color;
}

/** Get colors for an ordered list of model names (for chart series). */
export function getModelColors(models: string[]): string[] {
  return models.map(getModelColor);
}
