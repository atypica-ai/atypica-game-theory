"use client";

import { RulesDisplay as PrisonerDilemmaRules } from "../gameTypes/prisonerDilemma/RulesDisplay";
import { RulesDisplay as StagHuntRules } from "../gameTypes/stagHunt/RulesDisplay";
import { RulesDisplay as BeautyContestRules } from "../gameTypes/beautyContest/RulesDisplay";
import { RulesDisplay as GoldenBallRules } from "../gameTypes/goldenBall/RulesDisplay";
import { RulesDisplay as AllPayAuctionRules } from "../gameTypes/allPayAuction/RulesDisplay";
import { RulesDisplay as VolunteerDilemmaRules } from "../gameTypes/volunteerDilemma/RulesDisplay";
import { RulesDisplay as PublicGoodsRules } from "../gameTypes/publicGoods/RulesDisplay";
import { RulesDisplay as ColonelBlottoRules } from "../gameTypes/colonelBlotto/RulesDisplay";
import { RulesDisplay as TrolleyProblemRules } from "../gameTypes/trolleyProblem/RulesDisplay";
import { RulesDisplay as UltimatumGameRules } from "../gameTypes/ultimatumGame/RulesDisplay";

export function GameRulesDisplay({ gameTypeName }: { gameTypeName: string }) {
  switch (gameTypeName) {
    case "prisoner-dilemma": return <PrisonerDilemmaRules />;
    case "stag-hunt": return <StagHuntRules />;
    case "beauty-contest": return <BeautyContestRules />;
    case "golden-ball": return <GoldenBallRules />;
    case "all-pay-auction": return <AllPayAuctionRules />;
    case "volunteer-dilemma": return <VolunteerDilemmaRules />;
    case "public-goods": return <PublicGoodsRules />;
    case "colonel-blotto": return <ColonelBlottoRules />;
    case "trolley-problem": return <TrolleyProblemRules />;
    case "ultimatum-game": return <UltimatumGameRules />;
    default: return <p style={{ color: "var(--gt-t3)" }}>Rules not available.</p>;
  }
}
