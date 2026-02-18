export type SceneCopy = {
  id: string;
  chapter: string;
  headline: string;
  body: string[];
  bullets?: string[];
};

export const HERO = {
  title: "Atypica 2.0",
  subtitle: "The Agent That Understands Humans",
  body: [
    "Most agents are built to do tasks. Atypica 2.0 is built to understand decisions.",
    "Execution can be automated. Human reasoning must be modeled.",
  ],
};

export const SCENE_COPIES: SceneCopy[] = [
  {
    id: "two-agents",
    chapter: "01",
    headline: "Two Agent Paradigms. Two Different Outcomes.",
    body: [
      "Worker Agents optimize output: code, assets, and workflows.",
      "Understanding Agents optimize judgment: motives, values, trade-offs, and context.",
      "If your real question is why customers choose or delay, you need understanding, not only execution.",
    ],
    bullets: [
      "Worker: output-first",
      "Understanding: reasoning-first",
      "Atypica is built for the second problem",
    ],
  },
  {
    id: "simulator",
    chapter: "02",
    headline: "Simulator: Reconstruct One Mind, Not an Average Crowd",
    body: [
      "Simulator mode models one concrete decision journey at a time.",
      "It replays comparison behavior, hesitation loops, perceived risk, and commitment conditions.",
      "Teams can run counterfactuals: what changes when price, trust, social proof, or switching cost changes.",
    ],
    bullets: [
      "Person-level simulation",
      "Counterfactual decision tests",
      "Hesitation and trade-off mapping",
    ],
  },
  {
    id: "researcher",
    chapter: "03",
    headline: "Researcher: Ask Better Questions, Then Ask the Next One",
    body: [
      "Researcher mode acts like a trained interviewer with dynamic follow-up.",
      "It supports 1v1 interviews, one-to-many sessions, focus groups, panel discussions, and longitudinal tracking.",
      "The goal is not transcript volume. The goal is signal quality and contradiction mapping.",
    ],
    bullets: [
      "Probe and reframe in real time",
      "Track confidence shifts over time",
      "Interviewer + analyst in one loop",
    ],
  },
  {
    id: "world-model",
    chapter: "04",
    headline: "Build the Subjective World Model",
    body: [
      "Atypica outputs structured decision models, not just response summaries.",
      "The model captures value systems, risk tolerance, emotional triggers, decision pathways, and social influence.",
      "This moves teams from descriptive analytics to cognitive analytics.",
    ],
    bullets: [
      "Value system vectors",
      "Risk preference maps",
      "Emotion-linked pivots",
      "Social influence effects",
    ],
  },
  {
    id: "multi-modal",
    chapter: "05",
    headline: "Multi-Modal Understanding Stack",
    body: [
      "No single method is enough for strategic judgment.",
      "Atypica combines AI 1v1, focus groups, panel simulation, persona vector modeling, and behavior simulation.",
      "The advantage comes from synthesis and cross-validation across methods.",
    ],
    bullets: [
      "Triangulated evidence",
      "Parallel modalities",
      "Conflict resolution across methods",
    ],
  },
  {
    id: "use-cases",
    chapter: "06",
    headline: "Where Teams and Creators Use Atypica",
    body: [
      "Enterprise teams use Atypica for product testing, pricing validation, positioning, content forecasting, and journey simulation.",
      "Creators use it for persona testing, resonance analysis, and community feedback simulation.",
      "It turns guesswork into structured experimentation.",
    ],
    bullets: [
      "Product and growth teams",
      "Brand and strategy teams",
      "Independent creators and operators",
    ],
  },
];

export const CLOSING = {
  chapter: "07",
  kicker: "Final State",
  headline: "Atypica 2.0 does not decide for humans.",
  body: "It helps teams understand why humans decide.",
};

export const USE_CASE_TAPE = [
  "NEW PRODUCT TESTING",
  "PRICING STRATEGY VALIDATION",
  "BRAND POSITIONING OPTIMIZATION",
  "CONTENT STRATEGY FORECASTING",
  "USER JOURNEY SIMULATION",
  "CREATOR PERSONA TESTING",
  "COMMUNITY FEEDBACK SIMULATION",
] as const;
