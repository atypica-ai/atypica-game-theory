import "server-only";

interface CostEstimate {
  timeMinutes: number;
  tokens: number;
  priceYuan: number;
}

interface EstimationParams {
  mode: "productRnD" | "fastInsight" | "study";
  studyKind?: "testing" | "planning" | "insights" | "creation" | "misc";
  framework?: string;
  researchMethod?: "interview" | "discussion";
  personaCount?: number;
}

// Reference data from existing research sessions
const TOKEN_ESTIMATES = {
  productRnD: {
    base: 200_000,
    perSocialTrend: 30_000,
    perAudienceCall: 20_000,
  },
  fastInsight: {
    base: 150_000,
    perWebSearch: 10_000,
    perDeepResearch: 50_000,
  },
  study: {
    testing: { base: 300_000, perPersona: 25_000 },
    planning: { base: 250_000, perPersona: 20_000 },
    insights: { base: 350_000, perPersona: 30_000 },
    creation: { base: 280_000, perPersona: 22_000 },
    misc: { base: 300_000, perPersona: 25_000 },
  },
};

// Model pricing (per 1M tokens, in yuan)
const MODEL_PRICING = {
  "claude-sonnet-4": {
    input: 20, // ¥20 per 1M input tokens
    output: 100, // ¥100 per 1M output tokens
  },
};

export function estimateResearchCost(params: EstimationParams): CostEstimate {
  const { mode, studyKind, personaCount = 6 } = params;

  let totalTokens = 0;
  let timeMinutes = 30; // Default

  if (mode === "productRnD") {
    totalTokens =
      TOKEN_ESTIMATES.productRnD.base +
      TOKEN_ESTIMATES.productRnD.perSocialTrend * 2 +
      TOKEN_ESTIMATES.productRnD.perAudienceCall * 1;
    timeMinutes = 35;
  } else if (mode === "fastInsight") {
    totalTokens = TOKEN_ESTIMATES.fastInsight.base + TOKEN_ESTIMATES.fastInsight.perWebSearch * 2;
    timeMinutes = 20;
  } else if (mode === "study" && studyKind) {
    const studyConfig = TOKEN_ESTIMATES.study[studyKind];
    totalTokens = studyConfig.base + studyConfig.perPersona * personaCount;
    timeMinutes = 40;
  }

  // Assume 70% input, 30% output token distribution
  const inputTokens = totalTokens * 0.7;
  const outputTokens = totalTokens * 0.3;

  // Calculate cost (using claude-sonnet-4 pricing)
  const pricing = MODEL_PRICING["claude-sonnet-4"];
  const priceYuan =
    (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

  return {
    timeMinutes,
    tokens: Math.round(totalTokens),
    priceYuan: Math.round(priceYuan * 100) / 100, // Round to 2 decimals
  };
}
