"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        The ultimate test of <strong>friendship</strong> and <strong>greed</strong>.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Two players face a jackpot.</li>
          <li>You both choose: <strong>SPLIT</strong> or <strong>STEAL</strong>.</li>
          <li>If both Split: 50/50. If one Steals: They get 100%. If both Steal: 0%.</li>
        </ol>
      </Section>

      <Section label="Payoff table">
        <OutcomeTable rows={[
          { label: "Both Split", pts: "50% / 50%", note: "Fair share", variant: "pos" },
          { label: "You Split, They Steal", pts: "0% / 100%", note: "You lose it all", variant: "neg" },
          { label: "You Steal, They Split", pts: "100% / 0%", note: "You take it all", variant: "warn" },
          { label: "Both Steal", pts: "0% / 0%", note: "Nobody wins", variant: "neutral" },
        ]} />
      </Section>

      <Section label="The goal">
        <Insight>
          Walk away with the most money.
        </Insight>
      </Section>
    </>
  );
}
