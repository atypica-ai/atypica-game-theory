import { CharacterProfile } from "@/prisma/client";
import {
  ATTACHMENT_STYLES_WEIGHTED,
  ATTACHMENT_TAG,
  DEFENSIVE_STRATEGIES,
  DERAILER_TAG,
  DEVELOPMENT_LEVELS_WEIGHTED,
  DEVELOPMENT_TAG,
  PRIMARY_DESIRES,
  PRIMARY_FEARS,
  SCHWARTZ_VALUES_WEIGHTED,
  STRESS_TRIGGERS,
  VALUE_TENSIONS,
  pickRandomAge,
  pickRandomJob,
  uniformSample,
  weightedSample,
  weightedSample3,
} from "./catalog";

// Derailer options (matches CharacterProfile type)
const DERAILERS = [
  "excitable",
  "skeptical",
  "cautious",
  "reserved",
  "leisurely",
  "bold",
  "mischievous",
  "colorful",
  "diligent",
  "dutiful",
] as const;

type Derailer = (typeof DERAILERS)[number];

// Sample a numeric score from a mixture of 3 normals (μ=30, μ=50, μ=70)
// to avoid clustering everyone around 50
function sampleBigFiveScore(): number {
  const means = [30, 50, 70];
  const mean = means[Math.floor(Math.random() * means.length)];
  const std = 15;
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.min(100, Math.round(mean + z * std)));
}

// Sample anxiety/avoidance scores correlated with attachment style
function sampleAttachmentScores(style: "secure" | "anxious" | "dismissing" | "fearful"): {
  attachmentAnxiety: number;
  attachmentAvoidance: number;
} {
  const configs: Record<
    "secure" | "anxious" | "dismissing" | "fearful",
    { anxietyMean: number; avoidanceMean: number }
  > = {
    secure: { anxietyMean: 22, avoidanceMean: 20 },
    anxious: { anxietyMean: 72, avoidanceMean: 28 },
    dismissing: { anxietyMean: 25, avoidanceMean: 70 },
    fearful: { anxietyMean: 68, avoidanceMean: 65 },
  };
  const { anxietyMean, avoidanceMean } = configs[style];
  const std = 12;
  const noise = () => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
  };
  return {
    attachmentAnxiety: Math.max(0, Math.min(100, Math.round(anxietyMean + noise()))),
    attachmentAvoidance: Math.max(0, Math.min(100, Math.round(avoidanceMean + noise()))),
  };
}

export type GeneratedProfile = CharacterProfile & { age: number; title: string; tags: [string, string, string] };

export function generateRandomCharacterProfile(): GeneratedProfile {
  // ── Core ─────────────────────────────────────────────────────────────────
  // Fear, desire, and strategy are Enneagram-paired: same index
  const enneagramIndex = Math.floor(Math.random() * 9);
  const primaryFear = PRIMARY_FEARS[enneagramIndex];
  const primaryDesire = PRIMARY_DESIRES[enneagramIndex];
  const defensiveStrategy = DEFENSIVE_STRATEGIES[enneagramIndex];
  const dominantValues = weightedSample3(SCHWARTZ_VALUES_WEIGHTED);
  const valueTension = uniformSample(VALUE_TENSIONS);

  // ── Style (Big Five + ambition) ───────────────────────────────────────────
  const openness = sampleBigFiveScore();
  const conscientiousness = sampleBigFiveScore();
  const extraversion = sampleBigFiveScore();
  const agreeableness = sampleBigFiveScore();
  const emotionalStability = sampleBigFiveScore();
  const ambition = sampleBigFiveScore();

  // ── Relational ────────────────────────────────────────────────────────────
  const attachmentStyle = weightedSample(ATTACHMENT_STYLES_WEIGHTED);
  const { attachmentAnxiety, attachmentAvoidance } = sampleAttachmentScores(attachmentStyle);
  const trustStance = uniformSample([
    "trusts until proven wrong",
    "cautiously extends trust",
    "trust must be earned",
    "assumes ulterior motives",
  ] as const);

  // ── Cognition ─────────────────────────────────────────────────────────────
  const informationStyle = uniformSample([
    "concrete-sequential",
    "concrete-adaptive",
    "abstract-systematic",
    "abstract-intuitive",
  ] as const);
  const decisionCriteria = uniformSample([
    "logic-and-efficiency",
    "internal-consistency",
    "group-harmony",
    "personal-values",
  ] as const);
  const emotionalPerception = sampleBigFiveScore();
  const emotionalRegulation = sampleBigFiveScore();

  // ── Shadow ────────────────────────────────────────────────────────────────
  const primaryDerailer = uniformSample(DERAILERS);
  // 40% chance of secondary derailer, must differ from primary
  let secondaryDerailer: Derailer | undefined;
  if (Math.random() < 0.4) {
    const remaining = DERAILERS.filter((d) => d !== primaryDerailer);
    secondaryDerailer = uniformSample(remaining);
  }
  const stressTrigger = uniformSample(STRESS_TRIGGERS);
  const shadowExpression = uniformSample(["organized", "disorganized"] as const);

  // ── Development ───────────────────────────────────────────────────────────
  const level = weightedSample(DEVELOPMENT_LEVELS_WEIGHTED);
  const moralAuthority = uniformSample([
    "external-rules",
    "relational",
    "principled",
    "contextual",
  ] as const);

  // ── Demographics ──────────────────────────────────────────────────────────
  const age = pickRandomAge();
  const title = pickRandomJob();

  // ── Tags (deterministic from 3 most identity-defining keys) ───────────────
  const tags: [string, string, string] = [
    DERAILER_TAG[primaryDerailer],
    ATTACHMENT_TAG[attachmentStyle],
    DEVELOPMENT_TAG[level],
  ];

  return {
    core: { primaryFear, primaryDesire, defensiveStrategy, dominantValues, valueTension },
    style: { openness, conscientiousness, extraversion, agreeableness, emotionalStability, ambition },
    relational: { attachmentStyle, attachmentAnxiety, attachmentAvoidance, trustStance },
    cognition: { informationStyle, decisionCriteria, emotionalPerception, emotionalRegulation },
    shadow: { primaryDerailer, secondaryDerailer, stressTrigger, shadowExpression },
    development: { level, moralAuthority },
    age,
    title,
    tags,
  };
}
