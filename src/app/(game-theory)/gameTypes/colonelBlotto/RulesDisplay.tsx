"use client";

import { Overview, Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Strategy is about where you choose <strong>NOT</strong> to fight.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>You have <strong>6 soldiers</strong> to place across <strong>4 battlefields</strong> (0–3 each).</li>
          <li>Everyone does the same secretly.</li>
          <li>Whoever has the most soldiers on a field wins that field.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Win the most battlefields. Each one is worth 10 points.
        </p>
      </Section>
    </>
  );
}
