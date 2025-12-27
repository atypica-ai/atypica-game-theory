import { DiscussionTypeConfig } from "../index";
import { moderatorSystem, panelSummarySystem } from "./moderator";
import { panelRules } from "./persona";

export const debateConfig: DiscussionTypeConfig = {
  label: "Debate (Opposing Views)",
  description: "Structured opposing views: balanced discussion, respectful disagreement",
  moderatorSystem,
  panelSummarySystem,
  panelRules,
};
