import { Locale } from "next-intl";
import { debateConfig } from "./debate";
import { defaultConfig } from "./default";
import { roundtableConfig } from "./roundTable";

/**
 * Discussion type configuration interface
 * Defines the required functions and metadata for each discussion type
 */
export interface DiscussionTypeConfig {
  label: string; // Display label for UI (e.g., "Default (Focus Group)")
  description: string; // Description for tool schema and UI (e.g., "Focus group style: consensus building...")
  moderatorSystem: (params: { locale: Locale }) => string;
  panelSummarySystem: (params: { locale: Locale }) => string;
  panelRules: (params: { locale: Locale }) => string;
}

/**
 * Registry of discussion type configurations
 *
 * ═══════════════════════════════════════════════════════════════
 * THIS IS THE SINGLE SOURCE OF TRUTH for discussion types.
 * ═══════════════════════════════════════════════════════════════
 *
 * To add a new discussion type:
 * 1. Create a directory under discussionTypes/ with moderator.ts, persona.ts, and index.ts
 * 2. Import the config and add ONE entry to this object below
 *
 * To remove a discussion type:
 * 1. Remove ONE entry from this object
 *
 * That's it! The DiscussionType type is automatically derived from this object's keys.
 * Use string literals like "default", "debate", "roundtable" directly - TypeScript will autocomplete.
 */
const discussionTypeConfigs = {
  default: defaultConfig,
  debate: debateConfig,
  roundtable: roundtableConfig,
} as const satisfies Record<string, DiscussionTypeConfig>;

/**
 * Discussion type union type - automatically derived from registry keys
 * Use string literals like "default", "debate", "roundtable" directly
 */
export type DiscussionType = keyof typeof discussionTypeConfigs;

/**
 * Array of all discussion type values - derived from registry keys
 * Use this for Zod schemas, runtime validation, etc.
 */
export const DISCUSSION_TYPE_VALUES = Object.keys(discussionTypeConfigs) as DiscussionType[];

/**
 * Default discussion type value
 */
export const DEFAULT_DISCUSSION_TYPE: DiscussionType = "default";

/**
 * Get discussion type configuration
 * @param discussionType The discussion type to get config for
 * @returns Discussion type configuration
 */
export function getDiscussionTypeConfig(discussionType: DiscussionType): DiscussionTypeConfig {
  const config = discussionTypeConfigs[discussionType];
  if (!config) {
    throw new Error(`Unknown discussion type: ${discussionType}`);
  }
  return config;
}
