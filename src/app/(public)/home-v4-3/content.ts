/* ═══════════════════════════════════════════════════════
   HOME V4-3 — Fin.ai-inspired structured layout
   ═══════════════════════════════════════════════════════ */

export const HERO = {
  kicker: "ATYPICA 2.0",
  title: "The Agent That Understands Humans",
  body: "Most agents do tasks. Atypica does something harder — it models why people choose, hesitate, and decide.",
  cta: "Start a Study",
  secondaryCta: "How It Works",
  badges: ["1M+ AI Personas", "85% Behavioral Accuracy", "Trusted by Global Enterprises"],
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
    title: "The world in our heads is not a precise replica of reality.",
    body: [
      "\u2014 Daniel Kahneman, Thinking, Fast and Slow",
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
    body: ["From autonomous signal absorption to full-auto research to live human-AI dialogue."],
  },
  {
    id: "data-assets",
    number: "05",
    navLabel: "Data Assets",
    kicker: "ASSETS",
    title: "Assets of the Subjective World",
    body: [
      "Callable, verifiable, always consistent \u2014 built on real behavioral data and social science models.",
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
      sub: "Consumer Simulation",
      description:
        "Virtual consumers built from real behavioral data. Each carries unique values, risk profiles, and decision logic.",
    },
    {
      key: "sage" as const,
      label: "AI Sage",
      sub: "Expert Simulation",
      description:
        "Domain experts with two-layer memory — core knowledge and working knowledge that grows through every consultation.",
    },
  ],
};

export const RESEARCHER = {
  tag: "AI RESEARCHER",
  title: "Research Methods",
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
    description:
      "How people express themselves — social media, public statements, self-presentation.",
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
  {
    key: "risk",
    label: "Risk Preferences",
    x: 88,
    y: 28,
    description: "How people weigh uncertainty",
  },
  {
    key: "emotion",
    label: "Emotional Triggers",
    x: 88,
    y: 72,
    description: "What moves people to act",
  },
  {
    key: "decision",
    label: "Decision Pathways",
    x: 50,
    y: 94,
    description: "How choices actually get made",
  },
  {
    key: "social",
    label: "Social Influence",
    x: 12,
    y: 72,
    description: "The invisible pull of others",
  },
  {
    key: "cognitive",
    label: "Cognitive Frames",
    x: 12,
    y: 28,
    description: "Mental models that shape perception",
  },
] as const;

export const DIMENSION_PALETTE = [
  "#1bff1b",
  "#93c5fd",
  "#f59e0b",
  "#f472b6",
  "#22d3ee",
  "#a78bfa",
] as const;

/* ─── 04: Three Modes ─── */

export const THREE_MODES = [
  {
    key: "signal",
    title: "Signal Mode",
    badge: "SIGNAL",
    description:
      "Always-on intelligence. The agent continuously absorbs signals from social media, surfaces trends, and delivers findings without being asked.",
    link: "/newstudy",
    accent: "#1bff1b",
  },
  {
    key: "deep",
    title: "Deep Mode",
    badge: "DEEP",
    description:
      "End-to-end AI research — from study design to interviews to insight delivery. Weeks of work compressed into minutes.",
    link: "/newstudy",
    accent: "#93c5fd",
  },
  {
    key: "live",
    title: "Live Mode",
    badge: "LIVE",
    description:
      "AI Researcher leads deep interviews with real people or virtual personas. Conversations become structured insights.",
    link: "/newstudy",
    accent: "#f59e0b",
  },
] as const;

/* ─── 05: Data Assets ─── */

export const DATA_ASSETS = [
  {
    key: "persona",
    title: "AI Persona",
    subtitle: "Virtual Consumer Library",
    description: "Callable, verifiable virtual consumers built from real behavioral data. Each maintains consistent personality traits, cognitive biases, and decision frameworks.",
    heroStat: { value: "1M+", label: "AI Samples" },
    details: [
      { value: "70,000+", label: "Human baselines" },
      { value: "85%", label: "Behavioral accuracy" },
      { value: "Tier 0\u20133", label: "Fidelity system" },
    ],
    note: "Enterprises can upload their own interview data to build private persona libraries.",
    accent: "#1bff1b",
  },
  {
    key: "sage",
    title: "AI Sage",
    subtitle: "Virtual Expert Library",
    description: "Domain experts with two-layer memory \u2014 core knowledge stays stable, working knowledge grows through every consultation. Auto-detects knowledge gaps and fills them.",
    heroStat: { value: "85%", label: "Cost Reduction" },
    details: [
      { value: "4+", label: "Industry verticals" },
      { value: "Core + Working", label: "Memory architecture" },
      { value: "PDF, Audio, URL", label: "Import sources" },
    ],
    note: "Compared to traditional expert networks ($500\u20132,000/hr), cost reduced by ~85%.",
    accent: "#93c5fd",
  },
  {
    key: "panel",
    title: "AI Panel",
    subtitle: "Next-Gen Research Panel",
    description: "AI virtual samples and real respondents together \u2014 real respondents provide baseline calibration, AI provides scale. No traditional panel company can offer this.",
    heroStat: { value: "3\u20138", label: "Personas per Panel" },
    details: [
      { value: "3 modes", label: "Focus \u00b7 Debate \u00b7 Roundtable" },
      { value: "Real + AI", label: "Calibration source" },
      { value: "Auto", label: "Summary + Minutes" },
    ],
    note: "Real-time scalable samples that combine human ground truth with AI amplification.",
    accent: "#f59e0b",
  },
] as const;

/* ─── 06: Use Cases ─── */

export type Scenario = { name: string; desc: string };

export const USE_CASE_CATEGORIES = [
  {
    key: "enterprise" as const,
    label: "Enterprise Services",
    color: "#16a34a",
    items: [
      { name: "Consumer Insight & U&A", desc: "Segmentation, persona, JTBD, need-state discovery, qualitative interviews + insight reports" },
      { name: "Concept Testing & Innovation", desc: "New product concept tests, packaging / naming / value prop validation, innovation opportunity maps" },
      { name: "Brand Strategy & Positioning", desc: "Brand diagnostics, positioning & narrative, mental maps, communication propositions, audience definition" },
      { name: "Attribution Analysis", desc: "Drivers analysis, content / product / experience impact on conversion, decision-path decomposition" },
      { name: "Pricing & Business Model", desc: "Pricing model design (subscription / usage / tiered), WTP research, price architecture & upgrade paths" },
      { name: "Social Listening & Trends", desc: "Sentiment monitoring, trend reports, consumer voice synthesis across 5 platforms" },
      { name: "User Experience & VOC", desc: "VOC systems, customer journey & pain-point mapping, experience improvement roadmaps" },
      { name: "Sales Training & Simulation", desc: "Simulate target buyers for sales training, role-play exercises with AI personas" },
    ],
  },
  {
    key: "academic" as const,
    label: "Academic Research",
    color: "#d97706",
    items: [
      { name: "Social Simulation", desc: "Large-scale population modeling, policy impact testing through virtual communities" },
      { name: "Ethnography & Persona", desc: "AI-augmented ethnographic studies, digital persona construction from interview data" },
      { name: "AI-Augmented Interviews", desc: "Scalable qualitative research — 1-on-1 deep interviews powered by AI interviewer agents" },
    ],
  },
  {
    key: "prediction" as const,
    label: "Investment & Prediction",
    color: "#8b5cf6",
    items: [
      { name: "Event Outcome Prediction", desc: "Macro / political / tech / market event forecasting via multi-perspective simulation" },
      { name: "Multi-Perspective Consensus", desc: "Persona + expert viewpoint simulation, consensus generation across diverse perspectives" },
      { name: "Continuous Signal Tracking", desc: "Signal tape — ongoing sentiment monitoring with real-time judgment updates" },
      { name: "Post-Prediction Validation", desc: "Retrospective accuracy analysis, model calibration, prediction quality scoring" },
    ],
  },
];

export const CUSTOMER_STORIES = [
  {
    key: "food",
    category: "enterprise" as const,
    client: "Global Food Brand",
    quote: "We went from months of concept testing to days \u2014 and the AI-selected concept outperformed our control by 23%.",
    body: "Regular AI consumer feedback collection, validated by real interviews. Co-created chocolate concepts with AI consumers for Lunar New Year, building a concept library filtered by preference, emotional resonance, and market potential.",
    metrics: [
      { label: "R&D Cycle", value: "Months \u2192 Days" },
      { label: "Concepts", value: "6\u00d7 more" },
      { label: "Testing Time", value: "\u201380%" },
    ],
    avatarPrompt: "Simple line illustration portrait of a female marketing director at a global food company, confident expression, minimal clean lines, 2 colors green and black, white background, no text, profile headshot only",
  },
  {
    key: "tools",
    category: "enterprise" as const,
    client: "Power Tools Brand",
    quote: "Professional users are expensive and hard to recruit. Now we have an always-on virtual panel that gives real-time feedback on our CAD prototypes.",
    body: "Built Tier-3 AI Personas from real prosumer interview data. Product teams get instant professional user feedback on concepts, interfaces, and prototypes without recruitment overhead.",
    metrics: [
      { label: "Recruitment", value: "Zero" },
      { label: "Feedback", value: "Real-time" },
      { label: "Persona Tier", value: "Tier 3" },
    ],
    avatarPrompt: "Simple line illustration portrait of a male product engineer wearing safety goggles on forehead, focused expression, minimal clean lines, 2 colors blue and black, white background, no text, profile headshot only",
  },
  {
    key: "university",
    category: "academic" as const,
    client: "University Research Team",
    quote: "We simulated policy responses across 20,000 households in days \u2014 traditional methods would have taken years.",
    body: "Interviewed core family members (couples and parents) via 1-on-1 sessions to create AI Personas, then assembled them into AI Panels. The team tested different policy measures for improving birth rates through virtual panel discussions.",
    metrics: [
      { label: "Households", value: "20,000" },
      { label: "Method", value: "Interview \u2192 Panel" },
      { label: "Speed", value: "Years \u2192 Days" },
    ],
    avatarPrompt: "Simple line illustration portrait of a female academic researcher with glasses, thoughtful expression, minimal clean lines, 2 colors amber and black, white background, no text, profile headshot only",
  },
  {
    key: "prediction",
    category: "prediction" as const,
    client: "IOIIO.BET",
    quote: "We call the Subjective World Model via MCP to analyze sentiment on Polymarket events \u2014 and place bets based on what the model sees.",
    body: "An independent developer integrated Atypica\u2019s subjective world model through MCP protocol, feeding continuous sentiment signals into prediction algorithms for real-time event forecasting.",
    metrics: [
      { label: "Integration", value: "MCP API" },
      { label: "Signal", value: "Continuous" },
      { label: "Use", value: "Polymarket" },
    ],
    avatarPrompt: "Simple line illustration portrait of a young male indie developer with headphones around neck, sharp gaze, minimal clean lines, 2 colors purple and black, white background, no text, profile headshot only",
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
