/* ═══════════════════════════════════════════════════════
   HOME V2 — Structural data (text via i18n: HomeAtypicaV2)
   ═══════════════════════════════════════════════════════ */

/* ─── Hero ─── */

export const HERO_BADGE_KEYS = ["badgePersonas", "badgeAccuracy", "badgeTrusted"] as const;

/* ─── Chapters ─── */

export const CHAPTERS = [
  { id: "two-worlds", number: "01", key: "twoWorlds" },
  { id: "world-model", number: "02", key: "worldModel" },
  { id: "two-agents", number: "03", key: "twoAgents" },
  { id: "workflow", number: "04", key: "workflow" },
  { id: "data-assets", number: "05", key: "dataAssets" },
  { id: "solutions", number: "06", key: "solutions" },
] as const;

/* ─── 02: Two Agents ─── */

export const SIMULATOR_PERSONA_KEYS = ["consumer2c", "professional2b", "expert"] as const;

export const RESEARCHER_METHOD_KEYS = [
  "oneToOne",
  "oneToMany",
  "expertDiscussion",
  "focusGroup",
  "multiParty",
  "observation",
] as const;

export const PERSONA_TAG_KEYS = ["tagGenZ", "tagUrban", "tagPriceSensitive", "tagSocial"] as const;

export const PERSONA_DIMENSIONS = [
  { key: "dimValues", score: 2.4 },
  { key: "dimRisk", score: 1.8 },
  { key: "dimEmotion", score: 2.7 },
  { key: "dimDecision", score: 2.1 },
  { key: "dimSocial", score: 1.5 },
  { key: "dimCognitive", score: 2.0 },
] as const;

/* ─── 03: World Model ─── */

export const WORLD_MODEL_LAYERS = [
  { key: "expression", radius: 42 },
  { key: "story", radius: 33 },
  { key: "cognition", radius: 24 },
  { key: "behavior", radius: 15 },
] as const;


/* ─── 04: Three Modes ─── */

/* ─── 04: Workflow (Use Cases × Workflow) ─── */

export type WorkflowStep = { key: string; mode: "signal" | "deep" | "live" | "auto" };

export const WORKFLOW_GOALS = [
  {
    key: "consumerInsight",
    accent: "#1bff1b",
    primaryMockup: "signal" as const,
    steps: [
      { key: "scout", mode: "signal" as const },
      { key: "interview", mode: "live" as const },
      { key: "analyze", mode: "deep" as const },
      { key: "report", mode: "auto" as const },
    ],
  },
  {
    key: "conceptTesting",
    accent: "#93c5fd",
    primaryMockup: "deep" as const,
    steps: [
      { key: "brief", mode: "deep" as const },
      { key: "buildPersonas", mode: "auto" as const },
      { key: "test", mode: "live" as const },
      { key: "report", mode: "auto" as const },
    ],
  },
  {
    key: "brandStrategy",
    accent: "#f59e0b",
    primaryMockup: "live" as const,
    steps: [
      { key: "scout", mode: "signal" as const },
      { key: "interview", mode: "live" as const },
      { key: "analyze", mode: "deep" as const },
      { key: "position", mode: "auto" as const },
    ],
  },
  {
    key: "pricing",
    accent: "#f472b6",
    primaryMockup: "deep" as const,
    steps: [
      { key: "research", mode: "deep" as const },
      { key: "simulate", mode: "auto" as const },
      { key: "test", mode: "live" as const },
      { key: "optimize", mode: "auto" as const },
    ],
  },
  {
    key: "socialListening",
    accent: "#22d3ee",
    primaryMockup: "signal" as const,
    steps: [
      { key: "monitor", mode: "signal" as const },
      { key: "detect", mode: "signal" as const },
      { key: "analyze", mode: "deep" as const },
      { key: "alert", mode: "auto" as const },
    ],
  },
  {
    key: "userExperience",
    accent: "#a78bfa",
    primaryMockup: "live" as const,
    steps: [
      { key: "observe", mode: "signal" as const },
      { key: "interview", mode: "live" as const },
      { key: "map", mode: "deep" as const },
      { key: "recommend", mode: "auto" as const },
    ],
  },
  {
    key: "socialSimulation",
    accent: "#fb923c",
    primaryMockup: "deep" as const,
    steps: [
      { key: "buildPopulation", mode: "auto" as const },
      { key: "simulate", mode: "deep" as const },
      { key: "observe", mode: "signal" as const },
      { key: "report", mode: "auto" as const },
    ],
  },
  {
    key: "eventPrediction",
    accent: "#4ade80",
    primaryMockup: "signal" as const,
    steps: [
      { key: "monitor", mode: "signal" as const },
      { key: "multiPerspective", mode: "deep" as const },
      { key: "predict", mode: "auto" as const },
      { key: "validate", mode: "deep" as const },
    ],
  },
] as const;

type SignalBlock = { id: string; labelKey: string; weight: number };

export const SIGNAL_SNAPSHOTS: SignalBlock[][] = [
  [
    { id: "clean", labelKey: "cleanBeauty", weight: 5 },
    { id: "price", labelKey: "priceSensitivity", weight: 3 },
    { id: "kol", labelKey: "kolMentions", weight: 2 },
    { id: "brand", labelKey: "brandRecall", weight: 4 },
    { id: "sustain", labelKey: "sustainability", weight: 2 },
    { id: "peer", labelKey: "peerReviews", weight: 3 },
    { id: "pack", labelKey: "packaging", weight: 1 },
  ],
  [
    { id: "clean", labelKey: "cleanBeauty", weight: 3 },
    { id: "price", labelKey: "priceSensitivity", weight: 5 },
    { id: "kol", labelKey: "kolMentions", weight: 4 },
    { id: "brand", labelKey: "brandRecall", weight: 2 },
    { id: "sustain", labelKey: "sustainability", weight: 3 },
    { id: "peer", labelKey: "peerReviews", weight: 2 },
    { id: "pack", labelKey: "packaging", weight: 2 },
  ],
  [
    { id: "clean", labelKey: "cleanBeauty", weight: 4 },
    { id: "price", labelKey: "priceSensitivity", weight: 2 },
    { id: "kol", labelKey: "kolMentions", weight: 5 },
    { id: "brand", labelKey: "brandRecall", weight: 3 },
    { id: "sustain", labelKey: "sustainability", weight: 4 },
    { id: "peer", labelKey: "peerReviews", weight: 1 },
    { id: "pack", labelKey: "packaging", weight: 3 },
  ],
];

/* ─── 05: Data Assets ─── */

export const DATA_ASSET_KEYS = ["persona", "sage", "panel"] as const;

export const DATA_ASSET_ACCENTS: Record<string, string> = {
  persona: "#1bff1b",
  sage: "#93c5fd",
  panel: "#f59e0b",
};

/* ─── 06: Solutions ─── */

export const SOLUTION_ROLES = [
  { key: "creators", link: "/creators", accent: "#1bff1b" },
  { key: "influencers", link: "/influencers", accent: "#f59e0b" },
  { key: "marketers", link: "/marketers", accent: "#93c5fd" },
  { key: "startupOwners", link: "/startup-owners", accent: "#f472b6" },
  { key: "consultants", link: "/consultants", accent: "#22d3ee" },
  { key: "productManagers", link: "/product-managers", accent: "#a78bfa" },
  { key: "researcher", link: "/solutions", accent: "#4ade80" },
  { key: "investor", link: "/solutions", accent: "#fb923c" },
] as const;

export const CUSTOMER_STORY_KEYS = ["food", "tools", "university", "prediction"] as const;

export const CUSTOMER_STORY_META: Record<
  string,
  { category: string; avatarPrompt: string }
> = {
  food: {
    category: "enterprise",
    avatarPrompt:
      "Simple line illustration portrait of a female marketing director at a global food company, confident expression, minimal clean lines, 2 colors green and black, white background, no text, profile headshot only",
  },
  tools: {
    category: "enterprise",
    avatarPrompt:
      "Simple line illustration portrait of a male product engineer wearing safety goggles on forehead, focused expression, minimal clean lines, 2 colors blue and black, white background, no text, profile headshot only",
  },
  university: {
    category: "academic",
    avatarPrompt:
      "Simple line illustration portrait of a female academic researcher with glasses, thoughtful expression, minimal clean lines, 2 colors amber and black, white background, no text, profile headshot only",
  },
  prediction: {
    category: "prediction",
    avatarPrompt:
      "Simple line illustration portrait of a young male indie developer with headphones around neck, sharp gaze, minimal clean lines, 2 colors purple and black, white background, no text, profile headshot only",
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  enterprise: "#16a34a",
  academic: "#d97706",
  prediction: "#8b5cf6",
};

/* ─── Client list (proper nouns — no i18n) ─── */

export const CLIENTS = [
  "Mars",
  "Bosch",
  "Lenovo",
  "Fonterra",
  "Ant Group",
  "Huawei",
  "L\u2019Or\u00e9al",
  "WPP",
  "Proya",
] as const;

/* ─── Image prompts (API params — no i18n) ─── */

export const HERO_PROMPT =
  "Abstract emotional topology: soft drifting gradients, fractured signal ribbons, tiny pixel silhouettes appearing and dissolving at edges. Organic but controlled, with subtle green pulse accents and analog film texture. Vast negative space. No text.";

export const BG_PROMPTS = [
  "Split-field diagram on warm white paper: left side precise measurement grids and calibration lines in graphite, right side soft emotional topology with drifting signal ribbons. A single green dividing line separates both worlds. Minimal, scientific, no text.",
  "Subjective world model topology viewed from above: six dimensional axes radiating from a central core, concentric influence rings, parameter mesh with thin connection lines. Black on white with selective green node highlights, scientific diagram aesthetic, no text.",
  "Two parallel decision rails in a minimal system space: one deterministic rail with rigid geometry, one adaptive rail with organic flowing paths. Pixel agents as tiny dots flowing along both tracks. Monochrome with subtle green routing indicators, no text.",
  "Minimal product mode diagram on warm cream paper: four parallel operational channels arranged vertically, each with distinct geometric patterns \u2014 continuous waves, automated pipelines, conversational nodes, and structural meshes. Thin graphite lines, subtle green accent markers, scientific diagram aesthetic, no text.",
  "Multi-method research instrument field on dark matte surface: diverse analytical tools arranged in a semicircle, thin connecting lines between method nodes and modality channels. Charcoal and steel tones, sparse green highlights, analog instrument aesthetic, no text.",
  "Abstract scenario matrix on dark charcoal ground: nine interconnected chambers with flowing signal traces between them, each containing a tiny abstract symbol. Dark graphite and subtle green accents, retro scientific catalog aesthetic, no text.",
  "Convergence point on warm white: thin signal lines from all edges meeting at a calm center, subtle green pulse at the convergence. Minimal, precise, warm paper texture, no text.",
] as const;

export const ALL_BG_PROMPTS = [HERO_PROMPT, ...BG_PROMPTS] as const;
