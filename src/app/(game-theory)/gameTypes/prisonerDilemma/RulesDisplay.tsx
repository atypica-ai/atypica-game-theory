"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        You and one partner are in separate rooms — no talking allowed.
        Each round, you both secretly pick: <strong>Cooperate</strong> (help each other)
        or <strong>Defect</strong> (betray the other).
      </Overview>

      <Section label="What happens">
        <OutcomeTable rows={[
          { label: "You both cooperate", pts: "51 each", note: "Best for both of you", variant: "pos" },
          { label: "You defect, they cooperate", pts: "63 / 22", note: "You win big, they get burned", variant: "warn" },
          { label: "You cooperate, they defect", pts: "22 / 63", note: "You get burned, they win big", variant: "neg" },
          { label: "You both defect", pts: "39 each", note: "Worse than cooperating together", variant: "neutral" },
        ]} />
      </Section>

      <Section label="How to think about it">
        <Insight>
          Working together pays the most — but stabbing your partner in the back is always tempting.
          The catch? If you both betray, you both end up worse off.
          4 rounds. After each round you see what the other person did.
        </Insight>
      </Section>
    </>
  );
}
