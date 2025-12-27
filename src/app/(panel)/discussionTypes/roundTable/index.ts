import { DiscussionTypeConfig } from "../index";
import { moderatorSystem, panelSummarySystem } from "./moderator";
import { panelRules } from "./persona";

export const roundtableConfig: DiscussionTypeConfig = {
  label: "Roundtable (Peer Sharing)",
  description: "Peer-to-peer sharing: equal participation, collaborative problem-solving",
  moderatorSystem,
  panelSummarySystem,
  panelRules,
};
