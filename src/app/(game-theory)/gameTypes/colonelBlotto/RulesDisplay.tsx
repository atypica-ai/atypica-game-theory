"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Strategy is about where you choose <strong>NOT</strong> to fight.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>You have <strong>100 soldiers</strong> to distribute across 10 &quot;castles&quot;.</li>
          <li>Your opponent does the same secretly.</li>
          <li>You win a castle if you have <strong>more soldiers</strong> there than your opponent.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Win the most castles overall.
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          Used to model everything from military strategy to political campaigning.
        </Insight>
      </Section>
    </>
  );
}
