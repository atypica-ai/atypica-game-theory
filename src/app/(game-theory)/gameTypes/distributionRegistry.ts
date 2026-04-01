import type { ComponentType } from "react";
import { BeautyContestDistributionView } from "./beautyContest/DistributionView";
import { GoldenBallDistributionView } from "./goldenBall/DistributionView";
import { PrisonerDilemmaDistributionView } from "./prisonerDilemma/DistributionView";
import { StagHuntDistributionView } from "./stagHunt/DistributionView";

/**
 * Maps game type name → its academic distribution comparison component.
 *
 * To add a new game type's distribution view:
 * 1. Create `gameTypes/{name}/DistributionView.tsx`
 * 2. Export a React component (no required props)
 * 3. Add it here — the Results screen picks it up automatically
 */
export const distributionRegistry: Record<string, ComponentType> = {
  "prisoner-dilemma": PrisonerDilemmaDistributionView,
  "stag-hunt":        StagHuntDistributionView,
  "beauty-contest":   BeautyContestDistributionView,
  "golden-ball":      GoldenBallDistributionView,
};
