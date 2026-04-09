"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Everyone secretly picks a number from <strong>0 to 100</strong>.
        The winner is whoever gets closest to <strong>⅔ of the group&apos;s average</strong>.
      </Overview>

      <Section label="Quick example">
        <OutcomeTable rows={[
          { label: "4 players pick 20, 40, 60, 80", pts: "avg = 50", note: "Add up, divide by players", variant: "neutral" },
          { label: "⅔ of 50", pts: "≈ 33", note: "This is the magic target", variant: "pos" },
          { label: "40 is the closest pick", pts: "50 pts", note: "That player wins the pot!", variant: "pos" },
        ]} />
      </Section>

      <Section label="How to win">
        <Insight>
          Don&apos;t just guess a number — guess what <em>everyone else</em> will guess, then aim for ⅔ of that.
          But they&apos;re doing the same thing... so the smart number keeps getting lower.
          Winner(s) split 50 points. Everyone else gets 0. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
