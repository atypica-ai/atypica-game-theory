"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        There&apos;s a pot of <strong>50 points</strong> on the table.
        Each round, everyone secretly picks: <strong>Split</strong> (share nicely)
        or <strong>Steal</strong> (grab it all).
      </Overview>

      <Section label="What happens">
        <OutcomeTable rows={[
          { label: "Everyone picks Split", pts: "50 ÷ N", note: "Shared equally — everyone wins", variant: "pos" },
          { label: "Exactly 1 person Steals", pts: "50 / 0", note: "Stealer takes it all, rest get nothing", variant: "neg" },
          { label: "2+ people Steal", pts: "0 / share", note: "Stealers cancel out, Splitters share!", variant: "warn" },
        ]} />
      </Section>

      <Section label="The twist">
        <Insight>
          Being the only thief is very profitable. But if even one other person also steals,
          the thieves get nothing and the honest players win.
          Greed only works if you&apos;re the only greedy one. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
