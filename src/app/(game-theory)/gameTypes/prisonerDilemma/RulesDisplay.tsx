"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Can you trust your partner when <strong>betrayal</strong> is so tempting?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Two players are &quot;arrested&quot;.</li>
          <li>You can stay <strong>SILENT</strong> (Cooperate) or <strong>BETRAY</strong> (Defect).</li>
          <li>Your sentence depends on both your choices.</li>
        </ol>
      </Section>

      <Section label="Payoff table">
        <OutcomeTable rows={[
          { label: "Both Silent", pts: "1 yr / 1 yr", note: "Best for both", variant: "pos" },
          { label: "You Silent, They Betray", pts: "3 yrs / 0 yrs", note: "You take the fall", variant: "neg" },
          { label: "You Betray, They Silent", pts: "0 yrs / 3 yrs", note: "They take the fall", variant: "warn" },
          { label: "Both Betray", pts: "2 yrs / 2 yrs", note: "Mutual punishment", variant: "neutral" },
        ]} />
      </Section>

      <Section label="The goal">
        <Insight>
          Minimize your jail time.
        </Insight>
      </Section>
    </>
  );
}
