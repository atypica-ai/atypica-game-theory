/* ═══════════════════════════════════════════════════════
   HOME V4-3 — Fin.ai-inspired structured layout
   ═══════════════════════════════════════════════════════ */

export const HERO = {
  kicker: "ATYPICA 2.0",
  title: "The Agent That Understands Humans",
  body: "Most agents do tasks. Atypica does something harder — it models why people choose, hesitate, and decide.",
  cta: "Start a Study",
  secondaryCta: "How It Works",
  badges: [
    "1M+ AI Personas",
    "85% Behavioral Accuracy",
    "9 Enterprise Clients",
  ],
} as const;

/* ─── Chapters ─── */

export type Chapter = {
  id: string;
  number: string;
  navLabel: string;
  kicker: string;
  title: string;
  body: string[];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "two-worlds",
    number: "01",
    navLabel: "Two Worlds",
    kicker: "THE CORE PROBLEM",
    title: "We don\u2019t react to reality. We react to the model inside our heads.",
    body: [
      "\u2014 Daniel Kahneman",
      "The objective world can be measured. The subjective world \u2014 emotions, values, hesitations \u2014 must be modeled. Most AI agents work in the objective world, doing tasks for you. Atypica is the other kind: it simulates the subjective world to understand people.",
    ],
  },
  {
    id: "two-agents",
    number: "02",
    navLabel: "Two Agents",
    kicker: "CORE ARCHITECTURE",
    title: "Simulate \u00d7 Research",
    body: [
      "The Simulator becomes a specific person \u2014 reconstructing how they choose, why they hesitate, what tips the balance. The Researcher asks the right questions, probes deeper, draws out what people struggle to articulate.",
    ],
  },
  {
    id: "world-model",
    number: "03",
    navLabel: "World Model",
    kicker: "FOUNDATION",
    title: "Subjective World Model",
    body: [
      "Four layers of understanding, from surface expression to deep behavior. Six dimensions that define any person\u2019s decision-making world.",
    ],
  },
  {
    id: "three-modes",
    number: "04",
    navLabel: "Three Modes",
    kicker: "PRODUCT",
    title: "Three Ways to Understand",
    body: [
      "From autonomous signal absorption to full-auto research to live human-AI dialogue.",
    ],
  },
  {
    id: "data-assets",
    number: "05",
    navLabel: "Data Assets",
    kicker: "ASSETS",
    title: "Virtual Sample Infrastructure",
    body: [
      "Three types of AI-powered research assets, built on real behavioral data and social science models.",
    ],
  },
  {
    id: "use-cases",
    number: "06",
    navLabel: "Use Cases",
    kicker: "APPLICATION",
    title: "Every Scenario Where Understanding People Matters",
    body: [],
  },
];

/* ─── 02: Two Agents ─── */

export const SIMULATOR = {
  tag: "AI SIMULATOR",
  title: "Persona + Sage",
  description:
    "The Simulator becomes a specific person — not a statistical average. It reconstructs how they choose, why they hesitate, and what tips the balance.",
  roles: [
    {
      key: "persona" as const,
      label: "AI Persona",
      sub: "2C Consumer Simulation",
      description: "Virtual consumers built from real behavioral data. Each carries unique values, risk profiles, and decision logic.",
    },
    {
      key: "sage" as const,
      label: "AI Sage",
      sub: "2B Expert Simulation",
      description: "Domain experts with two-layer memory — core knowledge and working knowledge that grows through every consultation.",
    },
  ],
};

export const RESEARCHER = {
  tag: "AI RESEARCHER",
  title: "Five Research Methods",
  description:
    "The Researcher asks the right questions, probes deeper, draws out what people struggle to articulate. Part interviewer, part analyst — always listening.",
  methods: [
    { key: "interview", label: "1-on-1 Interview", icon: "chat" },
    { key: "oneToMany", label: "One-to-Many", icon: "users" },
    { key: "focusGroup", label: "Focus Group", icon: "group" },
    { key: "panel", label: "Panel Discussion", icon: "debate" },
    { key: "observation", label: "Behavioral Observation", icon: "eye" },
  ],
};

/* ─── 03: World Model ─── */

export const WORLD_MODEL_LAYERS = [
  {
    key: "expression",
    label: "Expression",
    description: "How people express themselves — social media, public statements, self-presentation.",
    product: "Scout Agent",
    radius: 42,
  },
  {
    key: "story",
    label: "Story",
    description: "How people explain themselves — narratives, interviews, personal histories.",
    product: "Interview System",
    radius: 33,
  },
  {
    key: "cognition",
    label: "Cognition",
    description: "How people make decisions — values, biases, mental models, judgment patterns.",
    product: "World Model Core",
    radius: 24,
  },
  {
    key: "behavior",
    label: "Behavior",
    description: "How people actually act — purchase decisions, real choices, long-term patterns.",
    product: "Use Cases & Validation",
    radius: 15,
  },
] as const;

export const WORLD_MODEL_DIMENSIONS = [
  { key: "values", label: "Value Systems", x: 50, y: 6, description: "What matters and why" },
  { key: "risk", label: "Risk Preferences", x: 88, y: 28, description: "How people weigh uncertainty" },
  { key: "emotion", label: "Emotional Triggers", x: 88, y: 72, description: "What moves people to act" },
  { key: "decision", label: "Decision Pathways", x: 50, y: 94, description: "How choices actually get made" },
  { key: "social", label: "Social Influence", x: 12, y: 72, description: "The invisible pull of others" },
  { key: "cognitive", label: "Cognitive Frames", x: 12, y: 28, description: "Mental models that shape perception" },
] as const;

export const DIMENSION_PALETTE = [
  "#4ade80", "#93c5fd", "#f59e0b", "#f472b6", "#22d3ee", "#a78bfa",
] as const;

/* ─── 04: Three Modes ─── */

export const THREE_MODES = [
  {
    key: "signal",
    title: "Signal Mode",
    badge: "SIGNAL",
    description: "Always-on intelligence. The agent continuously absorbs signals from social media, surfaces trends, and delivers findings without being asked.",
    link: "/newstudy",
    accent: "#4ade80",
  },
  {
    key: "deep",
    title: "Deep Mode",
    badge: "DEEP",
    description: "End-to-end AI research — from study design to interviews to insight delivery. Weeks of work compressed into minutes.",
    link: "/newstudy",
    accent: "#93c5fd",
  },
  {
    key: "live",
    title: "Live Mode",
    badge: "LIVE",
    description: "AI Researcher leads deep interviews with real people or virtual personas. Conversations become structured insights.",
    link: "/newstudy",
    accent: "#f59e0b",
  },
] as const;

/* ─── 05: Data Assets ─── */

export const DATA_ASSETS = [
  {
    key: "persona",
    title: "AI Persona",
    description: "Virtual consumers built from real behavioral data and social science models. Callable, verifiable, always consistent.",
    stats: [
      { label: "AI Samples", value: "1,000,000+" },
      { label: "Human Baselines", value: "70,000+" },
      { label: "Accuracy", value: "85%" },
      { label: "Tier System", value: "0\u20133" },
    ],
    accent: "#4ade80",
  },
  {
    key: "sage",
    title: "AI Sage",
    description: "Domain experts with two-layer memory architecture. Core knowledge stays stable; working knowledge grows through every consultation.",
    stats: [
      { label: "Industries", value: "Healthcare, Finance, CPG, Tech" },
      { label: "Cost Reduction", value: "~85%" },
      { label: "Memory", value: "Core + Working" },
      { label: "Knowledge Gaps", value: "Auto-detected" },
    ],
    accent: "#93c5fd",
  },
  {
    key: "panel",
    title: "AI Panel",
    description: "Next-gen research panels combining AI samples with real respondents. Simulate, compare, and scale.",
    stats: [
      { label: "Panel Size", value: "3\u20138 personas" },
      { label: "Modes", value: "Focus, Debate, Roundtable" },
      { label: "Calibration", value: "Real respondents" },
      { label: "Output", value: "Summary + Minutes" },
    ],
    accent: "#f59e0b",
  },
] as const;

/* ─── 06: Use Cases ─── */

export const USE_CASE_TABLE = [
  { scenario: "Consumer Insight & U&A", tools: "Scout + Interview + Persona", agent: "Study Agent" },
  { scenario: "Concept Testing", tools: "PersonaImport + Interview + Panel", agent: "Study Agent" },
  { scenario: "Brand Strategy", tools: "Social Trends + Report", agent: "Product R&D" },
  { scenario: "Attribution Analysis", tools: "Interview + Reasoning + Report", agent: "Study Agent" },
  { scenario: "Pricing Strategy", tools: "Interview (WTP) + Panel", agent: "Study Agent" },
  { scenario: "Social Listening", tools: "Scout (5 platforms) + Trends", agent: "Product R&D" },
  { scenario: "User Experience & VOC", tools: "Scout + Interview + Report", agent: "Study Agent" },
  { scenario: "Sales Training", tools: "PersonaImport + Persona Chat", agent: "Direct Use" },
  { scenario: "Academic Research", tools: "Scout + Persona + Panel", agent: "Study Agent" },
  { scenario: "Market Intelligence", tools: "MCP + Trends + Reasoning", agent: "Fast Insight" },
] as const;

export const CUSTOMER_STORIES = [
  {
    key: "food",
    client: "Global Food Brand",
    challenge: "Needed consumer feedback on 20+ product concepts across 5 markets in 2 weeks.",
    solution: "AI Persona interviews + Panel discussions replaced 3 months of traditional research.",
    result: "80% cost reduction, 6x faster, concept selected outperformed control by 23%.",
  },
  {
    key: "tools",
    client: "Industrial Tools Manufacturer",
    challenge: "Professional users too expensive and hard to recruit for product testing.",
    solution: "Imported real interview data to create Tier 3 AI Personas for continuous testing.",
    result: "Always-on virtual user panel, real-time feedback on CAD prototypes.",
  },
  {
    key: "university",
    client: "University Research Team",
    challenge: "20,000 household energy survey — traditional methods would take years.",
    solution: "Scout observation + Persona generation + AI Panel for policy simulation.",
    result: "Simulated policy responses across demographic segments in days.",
  },
  {
    key: "prediction",
    client: "Prediction Market Platform",
    challenge: "Needed sentiment model API for real-time event prediction.",
    solution: "MCP integration — calling Atypica\u2019s subjective world model via API.",
    result: "Continuous sentiment signals feeding prediction algorithms.",
  },
] as const;

/* ─── Closing ─── */

export const CLOSING = {
  title: "Ready to Understand Your Users?",
  body: "Let agents model every consumer\u2019s subjective world. The harder problem — we\u2019ve already started.",
  cta: "Request a Demo",
  secondaryCta: "Read Documentation",
};

/* ─── Client list ─── */

export const CLIENTS = [
  "Mars", "Bosch", "Lenovo", "Fonterra", "Ant Group",
  "Huawei", "L\u2019Or\u00e9al", "WPP", "Proya",
] as const;

/* ─── Image prompts ─── */

export const HERO_PROMPT =
  "A single massive translucent polyhedron with internal fractures, suspended in vast dark blue-gray void. Inside it, barely visible green particle streams flow slowly like veins. The surface catches cold light. Extremely sparse luminous particles drift in the surrounding emptiness. Cold palette: dark indigo-black background, steel gray and cool white on the form, faint green glow from within. Film grain texture. No text.";

/** Background images that shift as user scrolls — one per chapter (01-06) + closing */
export const BG_PROMPTS = [
  // 01 Two Worlds
  "Split-field diagram on warm white paper: left side precise measurement grids and calibration lines in graphite, right side soft emotional topology with drifting signal ribbons. A single green dividing line separates both worlds. Minimal, scientific, no text.",
  // 02 Two Agents
  "Two parallel decision rails in a minimal system space: one deterministic rail with rigid geometry, one adaptive rail with organic flowing paths. Pixel agents as tiny dots flowing along both tracks. Monochrome with subtle green routing indicators, no text.",
  // 03 World Model
  "Subjective world model topology viewed from above: six dimensional axes radiating from a central core, concentric influence rings, parameter mesh with thin connection lines. Black on white with selective green node highlights, scientific diagram aesthetic, no text.",
  // 04 Three Modes
  "Minimal product mode diagram on warm cream paper: four parallel operational channels arranged vertically, each with distinct geometric patterns \u2014 continuous waves, automated pipelines, conversational nodes, and structural meshes. Thin graphite lines, subtle green accent markers, scientific diagram aesthetic, no text.",
  // 05 Data Assets (dark image for light bg)
  "Multi-method research instrument field on dark matte surface: diverse analytical tools arranged in a semicircle, thin connecting lines between method nodes and modality channels. Charcoal and steel tones, sparse green highlights, analog instrument aesthetic, no text.",
  // 06 Use Cases (dark image for light bg)
  "Abstract scenario matrix on dark charcoal ground: nine interconnected chambers with flowing signal traces between them, each containing a tiny abstract symbol. Dark graphite and subtle green accents, retro scientific catalog aesthetic, no text.",
  // Closing
  "Convergence point on warm white: thin signal lines from all edges meeting at a calm center, subtle green pulse at the convergence. Minimal, precise, warm paper texture, no text.",
] as const;

export const ALL_BG_PROMPTS = [HERO_PROMPT, ...BG_PROMPTS] as const;
