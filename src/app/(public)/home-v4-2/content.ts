/* ─── Scene copy ─── */

export type SceneCopy = {
  id: string;
  chapter: string;
  railLabel: string;
  kicker: string;
  title: string;
  body: string[];
};

export const HERO = {
  kicker: "ATYPICA 2.0",
  title: "The Agent That Understands Humans",
  body: [
    "Most agents do tasks. Atypica does something harder \u2014 it models why people choose, hesitate, and decide.",
  ],
  cta: "Start Understanding",
  secondaryCta: "How It Works",
  terminal: [
    "BOOT:: SUBJECTIVE-WORLD ENGINE READY",
    "SCAN:: behavior traces aligned",
    "LINK:: persona mesh synced",
    "INSIGHT:: latent intent found",
  ],
};

export const SCENES: SceneCopy[] = [
  {
    id: "manifesto",
    chapter: "01",
    railLabel: "Two Worlds",
    kicker: "THE CORE PROBLEM",
    title: "Physics models the objective world. Atypica models the subjective one.",
    body: [
      "Every agent today is built to do work for you. Atypica is built for something harder.",
      "The objective world can be measured. The subjective world \u2014 emotions, values, hesitations \u2014 must be modeled.",
    ],
  },
  {
    id: "thesis",
    chapter: "02",
    railLabel: "Two Agents",
    kicker: "CORE THESIS",
    title: "An Agent System That Understands People",
    body: [
      "Through multiple agent interaction modes, Atypica models the subjective world of consumers. In the process, agents take on two roles \u2014",
    ],
  },
  {
    id: "world-model",
    chapter: "03",
    railLabel: "World Model",
    kicker: "CORE TECHNOLOGY",
    title: "Subjective World Model",
    body: [
      "We\u2019re building a foundation model for the subjective world \u2014 systematically modeling the decision-making inner worlds of consumers and business decision-makers.",
    ],
  },
  {
    id: "operating-modes",
    chapter: "04",
    railLabel: "Product Modes",
    kicker: "PRODUCT MODES",
    title: "Four Ways to Understand",
    body: [
      "From autonomous signal absorption to full-auto research to human-in-the-loop deep interviews.",
    ],
  },
  {
    id: "understanding-stack",
    chapter: "05",
    railLabel: "Methods",
    kicker: "MARKET APPLICATION",
    title: "Multi-Method \u00d7 Multi-Modal",
    body: [
      "Understand users through diverse research methods and input modalities \u2014 powered by virtual sample systems built on real behavioral data.",
    ],
  },
  {
    id: "use-cases",
    chapter: "06",
    railLabel: "Use Cases",
    kicker: "USE CASES",
    title: "Every Scenario Where Understanding People Matters",
    body: [],
  },
];

export const CLOSING = {
  chapter: "07",
  kicker: "FINAL STATE",
  title: "Ready to Understand Your Users?",
  body: "Let agents model every consumer\u2019s subjective world. The harder problem \u2014 we\u2019ve already started.",
  cta: "Request a Demo",
  secondaryCta: "Read the Whitepaper",
};

/* ─── Thesis data ─── */

export const THESIS_ROLES = [
  {
    key: "simulator" as const,
    tag: "Persona Modeling",
    title: "AI Simulator",
    description:
      "Becomes a specific person \u2014 not a statistical average. Reconstructs how they choose, why they hesitate, and what tips the balance. Each persona carries unique values, risk profiles, and decision logic.",
    stat: "300K+ personas \u00b7 85% behavioral consistency",
    accent: "#4ade80",
  },
  {
    key: "researcher" as const,
    tag: "Active Listening",
    title: "AI Researcher",
    description:
      "Asks the right questions, probes deeper, draws out what people struggle to articulate. Five Whys, not five checkboxes. Part interviewer, part analyst \u2014 always listening.",
    items: [
      "1-on-1 Deep Interview",
      "One-to-Many",
      "Focus Group",
      "Panel Discussion",
      "Behavioral Observation",
    ],
    accent: "#93c5fd",
  },
] as const;

/* ─── World Model data ─── */

export const SWM_NODES = [
  { key: "values", label: "Value Systems", x: 50, y: 10, description: "What matters and why" },
  { key: "risk", label: "Risk Preferences", x: 82, y: 28, description: "How people weigh uncertainty" },
  { key: "emotion", label: "Emotional Triggers", x: 82, y: 72, description: "What moves people to act" },
  { key: "decision", label: "Decision Pathways", x: 50, y: 90, description: "How choices actually get made" },
  { key: "social", label: "Social Influence", x: 18, y: 72, description: "The invisible pull of others" },
  { key: "cognitive", label: "Cognitive Frames", x: 18, y: 28, description: "Mental models that shape perception" },
] as const;

export const SWM_PALETTE = [
  "#4ade80", "#93c5fd", "#f59e0b", "#f472b6", "#22d3ee", "#a78bfa",
] as const;

/* ─── Operating Modes data ─── */

export const OPERATING_MODES = [
  {
    key: "proactive",
    title: "Proactive Mode",
    badge: "PROACTIVE",
    description: "Always-on intelligence. The agent continuously absorbs signals, surfaces insights, and delivers findings without being asked.",
    hint: "Continuous Sensing",
    accent: "#4ade80",
  },
  {
    key: "auto",
    title: "Auto Mode",
    badge: "AUTO",
    description: "End-to-end AI research \u2014 from study design to data generation to insight delivery. Weeks of work compressed into minutes.",
    hint: "Autonomous Orchestration",
    accent: "#93c5fd",
  },
  {
    key: "human",
    title: "Human Mode",
    badge: "HUMAN",
    description: "AI leads deep interviews with real people or virtual personas. Conversations become structured insights and actionable conclusions.",
    hint: "Deep Interview",
    accent: "#f59e0b",
  },
  {
    key: "model",
    title: "Subjective Model",
    badge: "MODEL",
    description: "Virtual sample systems built on real behavioral data and social science models \u2014 callable, verifiable, extensible.",
    hint: "Model Invocation",
    accent: "#a78bfa",
  },
] as const;

/* ─── Understanding Stack data ─── */

export const RESEARCH_METHODS = [
  "1-on-1 Interview",
  "One-to-Many",
  "Group Discussion",
  "Expert Interview",
  "Behavioral Observation",
] as const;

export const INPUT_MODALITIES = [
  "Text", "Image", "Video", "Web", "Audio",
] as const;

export const METHOD_ACCENTS = ["#4ade80", "#93c5fd", "#f59e0b", "#f472b6", "#22d3ee"] as const;
export const MODALITY_ACCENTS = ["#4ade80", "#f59e0b", "#93c5fd", "#a78bfa", "#f472b6"] as const;

export const VIRTUAL_SAMPLES = [
  {
    key: "persona",
    title: "AI Persona",
    description: "Virtual consumers built from real behavioral data and social science models. Callable, verifiable, always consistent.",
    stat: "1,000,000+ AI \u00b7 70,000+ Human",
    accent: "#4ade80",
  },
  {
    key: "sage",
    title: "AI Sage",
    description: "Domain experts synthesized from professional interviews. Industry veterans, academic authorities, strategic advisors.",
    stat: "Industry \u00b7 Academic \u00b7 Advisory",
    accent: "#93c5fd",
  },
  {
    key: "panel",
    title: "AI Panel",
    description: "Next-gen research panels combining AI samples with real respondents. Simulate, compare, and scale your subjective world models.",
    stat: "Simulate \u00b7 Compare \u00b7 Scale",
    accent: "#f59e0b",
  },
] as const;

/* ─── Use Cases data ─── */

export const USE_CASES = [
  { key: "c1", title: "Consumer Insight & Market Research", description: "Segmentation, personas, U&A, JTBD, qualitative interviews + insight reports." },
  { key: "c2", title: "Concept Testing & Innovation", description: "New product concepts, packaging, naming, value proposition validation." },
  { key: "c3", title: "Brand Strategy & Communication", description: "Brand diagnostics, positioning & narrative, communication propositions." },
  { key: "c4", title: "Attribution Analysis", description: "Drivers analysis, content/product/experience impact on conversion, decision path decomposition." },
  { key: "c5", title: "Pricing & Business Model", description: "Pricing model design, willingness-to-pay studies, price architecture." },
  { key: "c6", title: "Social Listening & Trend Intel", description: "Sentiment monitoring, trend reports, consumer voice synthesis." },
  { key: "c7", title: "User Experience & VOC", description: "VOC systems, customer journey & pain points, experience improvement." },
  { key: "c8", title: "Academic & Social Science", description: "Social simulation, ethnography, in-depth interview research." },
  { key: "c9", title: "Predictive & Market Intelligence", description: "Event prediction, multi-viewpoint consensus, signal tracking & validation." },
] as const;

/* ─── Client list ─── */

export const CLIENTS = [
  "Mars", "Bosch", "Lenovo", "Fonterra", "Ant Group",
  "Huawei", "L'Or\u00e9al", "WPP", "Proya",
] as const;

/* ─── Image prompts ─── */

export const HERO_PROMPT =
  "A single massive translucent polyhedron with internal fractures, suspended in vast dark blue-gray void. Inside it, barely visible green particle streams flow slowly like veins. The surface catches cold light. Extremely sparse luminous particles drift in the surrounding emptiness. Cold palette: dark indigo-black background, steel gray and cool white on the form, faint green glow from within. Film grain texture. No text.";

export const SCENE_PROMPTS = [
  "Split-field diagram on warm white paper: left side precise measurement grids and calibration lines in graphite, right side soft emotional topology with drifting signal ribbons. A single green dividing line separates both worlds. Minimal, scientific, no text.",
  "Two parallel decision rails in a minimal system space: one deterministic rail with rigid geometry, one adaptive rail with organic flowing paths. Pixel agents as tiny dots flowing along both tracks. Monochrome with subtle green routing indicators, no text.",
  "Subjective world model topology viewed from above: six dimensional axes radiating from a central core, concentric influence rings, parameter mesh with thin connection lines. Black on white with selective green node highlights, scientific diagram aesthetic, no text.",
  "Minimal product mode diagram on warm cream paper: four parallel operational channels arranged vertically, each with distinct geometric patterns \u2014 continuous waves, automated pipelines, conversational nodes, and structural meshes. Thin graphite lines, subtle green accent markers, scientific diagram aesthetic, no text.",
  "Multi-method research instrument field on warm white: diverse analytical tools arranged in a semicircle, thin connecting lines between method nodes and modality channels. Pencil-thin graphite strokes, sparse green highlights, archival paper texture, no text.",
  "Abstract scenario matrix on warm parchment: nine interconnected chambers with flowing signal traces between them, each containing a tiny abstract symbol. Light graphite and subtle green accents, scientific catalog aesthetic, no text.",
] as const;

export const CLOSING_PROMPT =
  "Convergence point on warm white: thin signal lines from all edges meeting at a calm center, subtle green pulse at the convergence. Minimal, precise, warm paper texture, no text.";

export const ALL_PROMPTS = [HERO_PROMPT, ...SCENE_PROMPTS, CLOSING_PROMPT] as const;

/* ─── Manifesto split image prompts ─── */

export const OBJECTIVE_PROMPT =
  "Abstract retro-scientific instrument field: precise modular grids, matte metal frames, thin calibration markings, restrained green phosphor traces. The composition feels measurable, objective, engineered. Charcoal and steel palette, faint film grain. No text, no people.";

export const SUBJECTIVE_PROMPT =
  "Abstract emotional topology: soft drifting gradients, fractured signal ribbons, tiny pixel silhouettes appearing and dissolving at edges. Organic but controlled, with subtle green pulse accents and analog film texture. Vast negative space. No text.";

/* ─── Thesis image prompts ─── */

export const SIMULATOR_PROMPT =
  "Abstract retro-futurist social simulation board. Many tiny pixel personas placed on floating matte modules, connected by thin green dotted paths and subtle vector arrows. Cold steel and charcoal tones, sparse highlights, analog instrument feeling, large negative space. No text.";

export const RESEARCHER_PROMPT =
  "Abstract interview observatory: semicircle of translucent panels with tiny pixel persona silhouettes, one brighter facilitator node, faint question particles, restrained CRT glow and film grain. Dark minimal background, green accent lines, no text.";

/* ─── Operating Modes image prompts ─── */

export const MODE_PROMPTS = [
  "Abstract always-on sensing field on warm cream paper: thin circular sweeps and sparse signal dots in flowing concentric patterns. Pencil-thin graphite lines with delicate green phosphor traces. Light airy composition, archival paper texture. No text.",
  "Abstract automated pipeline on warm white: layered instrument modules transforming raw signal particles into clean geometric insight tokens. Fine graphite lines, subtle green energy paths, vintage scientific illustration feeling. No text.",
  "Abstract interview space on warm cream: one central facilitator node surrounded by semi-formed personas, connected by delicate conversational ripples and thin signal lines. Pencil strokes, warm paper texture, sparse green accents. No text.",
  "Abstract model vault on warm parchment: nested wireframe layers, tiny persona fragments, and controlled pulse waves converging to a structural core. Fine graphite lines, subtle green node markers, archival catalog aesthetic. No text.",
] as const;

/* ─── Virtual Samples image prompts ─── */

export const SAMPLE_PROMPTS = [
  "Abstract persona archive on warm white: dense field of tiny pixel silhouettes etched into layered pale slabs, with selective green highlights and dotted relation traces. Light graphite strokes, archival catalog feeling, no text.",
  "Abstract expert strata on warm cream: stacked translucent plates containing symbolic knowledge fragments and soft signal drift. Light pencil tones with muted green markers, vintage paper texture, no text.",
  "Abstract collective intelligence ring on warm white: multiple tiny personas around a subtle glowing center, radial connection lines, calm harmonic traces. Fine graphite, sparse green accents, scientific diagram aesthetic, no text.",
] as const;

/* ─── Use Cases image prompts ─── */

export const CASE_PROMPTS = [
  "Abstract signal cartography on warm white: drifting flow vectors and directional traces over light terrain. Pencil-thin graphite strokes with subtle green calibration accents, archival paper texture. No text.",
  "Abstract innovation diagram on warm cream: geometric prototypes and sparse waveform ribbons with controlled intersections. Fine graphite lines, delicate green highlights, vintage scientific illustration. No text.",
  "Abstract decision observatory on warm white: layered translucent panels and soft pulse rings with connected insight nodes. Light graphite, sparse green accents, archival paper texture. No text.",
] as const;
