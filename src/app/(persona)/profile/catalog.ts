import jobs from "./data/jobs.json";

// ── Enneagram-paired arrays (same index = same type) ─────────────────────────
// Pick one index i from 0–8 and use primaryFears[i], primaryDesires[i], defensiveStrategies[i]

export const PRIMARY_FEARS = [
  "being corrupt, wrong, or imperfect in a way that cannot be fixed",
  "being unloved or unwanted — that care must always be earned",
  "being seen as a failure or fundamentally worthless",
  "having no identity or significance — being utterly ordinary",
  "being incompetent, depleted, or overwhelmed by the world",
  "being without support or guidance when everything falls apart",
  "being trapped in pain, deprivation, or boredom with no exit",
  "being controlled, harmed, or violated by someone stronger",
  "losing connection and inner wholeness — separation and fragmentation",
] as const;

export const PRIMARY_DESIRES = [
  "to be good, ethical, and beyond reproach",
  "to feel genuinely loved and indispensable to others",
  "to be seen as successful, valuable, and admirable",
  "to have a true identity — to be unique and deeply understood",
  "to be self-sufficient and capable enough to not need others",
  "to have certainty, loyal allies, and a safe foundation",
  "to stay satisfied, stimulated, and free from limitation",
  "to be strong and self-reliant enough to protect what matters",
  "inner peace and harmony — to feel whole and undisturbed",
] as const;

export const DEFENSIVE_STRATEGIES = [
  "obsessively self-corrects and reforms to prevent any criticism",
  "gives generously to create bonds, then tracks reciprocity unconsciously",
  "constantly reshapes identity to match what the audience values most",
  "amplifies their distinctiveness and mourns what is missing or lost",
  "withdraws to observe, hoards knowledge and energy, minimizes needs",
  "tests loyalty, scans constantly for threat, defers to trusted authority",
  "generates options and keeps moving to avoid committing to pain",
  "pre-empts vulnerability by asserting dominance and control first",
  "merges with others' agendas, numbs own needs, avoids any disruption",
] as const;

// ── Schwartz values with population weights ──────────────────────────────────
// Population frequency from European Social Survey cross-cultural data.
// Benevolence most endorsed, Power least (Schwartz 2012).

export const SCHWARTZ_VALUES_WEIGHTED: { value: string; weight: number }[] = [
  { value: "Benevolence", weight: 15 },
  { value: "Universalism", weight: 13 },
  { value: "Self-Direction", weight: 12 },
  { value: "Security", weight: 11 },
  { value: "Conformity", weight: 10 },
  { value: "Achievement", weight: 10 },
  { value: "Hedonism", weight: 9 },
  { value: "Tradition", weight: 8 },
  { value: "Stimulation", weight: 7 },
  { value: "Power", weight: 5 },
];

// ── Value tensions (null ~30% of the time) ───────────────────────────────────

export const VALUE_TENSIONS: (string | null)[] = [
  "Achievement vs. Benevolence — wants to succeed but fears being seen as selfish",
  "Power vs. Conformity — craves control but needs to be liked",
  "Self-Direction vs. Security — wants freedom but fears instability",
  "Universalism vs. Achievement — believes in equality but is driven to outperform",
  "Stimulation vs. Security — chases novelty but collapses without routine",
  "Hedonism vs. Tradition — wants pleasure but is haunted by duty",
  "Benevolence vs. Self-Direction — gives to others at the cost of their own needs",
  "Power vs. Universalism — wants influence but holds egalitarian ideals",
  null,
  null,
  null,
];

// ── Shadow stress triggers ───────────────────────────────────────────────────

export const STRESS_TRIGGERS = [
  "being publicly humiliated or exposed as incompetent",
  "losing control of an important outcome",
  "being excluded or made to feel invisible",
  "perceived disrespect or being talked down to",
  "having their loyalty questioned or betrayed",
  "being held to a standard they consider unfair",
  "watching someone else receive credit they deserved",
  "being denied the autonomy to do something their own way",
  "sudden change that destabilizes a system they built",
  "being confronted with a failure they cannot rationalize away",
  "being ignored when they most need to be heard",
  "being asked to compromise on something they consider non-negotiable",
] as const;

// ── Attachment styles with population weights ────────────────────────────────
// Based on Bartholomew & Horowitz; Fraley et al. meta-analyses (Western adult populations)

export const ATTACHMENT_STYLES_WEIGHTED: {
  value: "secure" | "anxious" | "dismissing" | "fearful";
  weight: number;
}[] = [
  { value: "secure", weight: 58 },
  { value: "anxious", weight: 20 },
  { value: "dismissing", weight: 17 },
  { value: "fearful", weight: 5 },
];

// ── Development levels with population weights ───────────────────────────────
// Based on Kegan; Cook-Greuter research on adult populations

export const DEVELOPMENT_LEVELS_WEIGHTED: {
  value: "impulsive" | "self-protective" | "socialized" | "self-authoring" | "self-transforming";
  weight: number;
}[] = [
  { value: "impulsive", weight: 8 },
  { value: "self-protective", weight: 12 },
  { value: "socialized", weight: 55 },
  { value: "self-authoring", weight: 23 },
  { value: "self-transforming", weight: 2 },
];

// ── Helper: random age and job ───────────────────────────────────────────────

export function pickRandomAge(): number {
  return Math.floor(Math.random() * (80 - 18 + 1)) + 18;
}

export function pickRandomJob(): string {
  return (jobs as string[])[Math.floor(Math.random() * jobs.length)];
}

// ── Tag maps: 3 most identity-defining keys → finite tag vocabulary ───────────
// Tags are derived deterministically from the profile — not LLM-generated.
// Three dimensions chosen: derailer (failure mode), attachment (relational pattern),
// development level (reasoning complexity). Together they fingerprint a persona.

export const DERAILER_TAG: Record<string, string> = {
  excitable: "Volatile",
  skeptical: "Distrustful",
  cautious: "Risk-Averse",
  reserved: "Detached",
  leisurely: "Passive-Aggressive",
  bold: "Arrogant",
  mischievous: "Manipulative",
  colorful: "Dramatic",
  diligent: "Perfectionist",
  dutiful: "Compliant",
};

export const ATTACHMENT_TAG: Record<string, string> = {
  secure: "Secure",
  anxious: "Anxious",
  dismissing: "Avoidant",
  fearful: "Fearful",
};

export const DEVELOPMENT_TAG: Record<string, string> = {
  impulsive: "Impulsive",
  "self-protective": "Self-Serving",
  socialized: "Conventional",
  "self-authoring": "Principled",
  "self-transforming": "Integrative",
};

// ── Generic weighted sampler ─────────────────────────────────────────────────

export function weightedSample<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

// Pick 3 distinct values from the weighted pool (no duplicates)
export function weightedSample3(
  items: { value: string; weight: number }[],
): [string, string, string] {
  const result: string[] = [];
  const pool = [...items];
  while (result.length < 3) {
    const picked = weightedSample(pool);
    result.push(picked);
    pool.splice(
      pool.findIndex((i) => i.value === picked),
      1,
    );
  }
  return result as [string, string, string];
}

// Uniform random from array
export function uniformSample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
