"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Two players, no communication.</li>
          <li>Each round, you both secretly choose: <strong>Cooperate</strong> or <strong>Defect</strong>.</li>
          <li>Your payoff depends on both your choices.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Maximize your points. Mutual cooperation pays well — but betrayal pays more, if you can get away with it.
        </p>
      </Section>
    </>
  );
}
