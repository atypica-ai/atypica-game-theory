import { SCENE_COPIES } from "./narrative.ui";

export type LayoutType =
  | "dual-track"
  | "decision-timeline"
  | "question-rings"
  | "param-topology"
  | "routing-matrix"
  | "usecase-conveyor";

export type SceneConfig = {
  id: string;
  chapter: string;
  layoutType: LayoutType;
  prompt: string;
};

const layouts: LayoutType[] = [
  "dual-track",
  "decision-timeline",
  "question-rings",
  "param-topology",
  "routing-matrix",
  "usecase-conveyor",
];

const prompts = [
  "Two parallel decision rails in a minimal white system space, black mono line geometry, one rail deterministic one adaptive, pixel agents flowing, no text",
  "Simulation timeline map, white and graphite, branching decisions and hesitation loops, sampled trajectory points, no text",
  "AI interview chamber abstract, concentric question rings and echo traces, white paper-like background, monochrome, no text",
  "Subjective world model topology, five-dimensional parameter mesh with value, risk, emotion, pathway and social axes, black on white, no text",
  "Multi-modal understanding matrix, dynamic method network and signal routing, minimal white interface field, monochrome, no text",
  "Use-case conveyor timeline in a bright simulation lab, state nodes and transfer arrows, pixel artifacts, no text",
] as const;

export const HERO_PROMPT =
  "Bright abstract human intelligence field, white background, thin black technical lines, pixel particles converging into a subtle silhouette, no text";

export const CLOSING_PROMPT =
  "Noise convergence to a clean center point, abstract white system closure, final state calm and precise, no text";

export const SCENE_CONFIG: SceneConfig[] = SCENE_COPIES.map((copy, idx) => ({
  id: copy.id,
  chapter: copy.chapter,
  layoutType: layouts[idx],
  prompt: prompts[idx],
}));
