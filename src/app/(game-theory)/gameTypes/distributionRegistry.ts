import type { ComponentType } from "react";
import type { GameSessionStats } from "../types";
import type { StatsData } from "../lib/stats/types";
import { BeautyContestDistributionView } from "./beautyContest/DistributionView";
import { GoldenBallDistributionView } from "./goldenBall/DistributionView";
import { PrisonerDilemmaDistributionView } from "./prisonerDilemma/DistributionView";
import { StagHuntDistributionView } from "./stagHunt/DistributionView";
import { AllPayAuctionDistributionView } from "./allPayAuction/DistributionView";
import { VolunteerDilemmaDistributionView } from "./volunteerDilemma/DistributionView";
import { PublicGoodsDistributionView } from "./publicGoods/DistributionView";
import { ColonelBlottoDistributionView } from "./colonelBlotto/DistributionView";
import { TrolleyProblemDistributionView } from "./trolleyProblem/DistributionView";

export type { GameSessionStats };

export interface DistributionViewProps {
  sessionStats?: GameSessionStats;
  aggregateData?: StatsData;
}

/**
 * Maps game type name → its academic distribution comparison component.
 */
export const distributionRegistry: Record<string, ComponentType<DistributionViewProps>> = {
  "prisoner-dilemma": PrisonerDilemmaDistributionView,
  "stag-hunt":        StagHuntDistributionView,
  "beauty-contest":   BeautyContestDistributionView,
  "golden-ball":      GoldenBallDistributionView,
  "all-pay-auction":  AllPayAuctionDistributionView,
  "volunteer-dilemma": VolunteerDilemmaDistributionView,
  "public-goods":     PublicGoodsDistributionView,
  "colonel-blotto":   ColonelBlottoDistributionView,
  "trolley-problem":  TrolleyProblemDistributionView,
};
