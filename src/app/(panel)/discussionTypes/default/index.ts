import { DiscussionTypeConfig } from "../index";
import { moderatorSystem, panelSummarySystem } from "./moderator";
import { panelRules } from "./persona";

export const defaultConfig: DiscussionTypeConfig = {
  label: "Default (Focus Group)",
  description: "Focus group style: consensus building, tension creation, pattern extraction",
  moderatorSystem,
  panelSummarySystem,
  panelRules,
};
