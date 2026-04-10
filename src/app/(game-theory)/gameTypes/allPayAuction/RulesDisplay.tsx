"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        The only auction where <strong>losing</strong> still costs you everything.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Everyone bids for an item.</li>
          <li>The <strong>highest bidder</strong> wins the item.</li>
          <li><strong>CRITICAL</strong>: Everyone must pay their bid, even if they lose!</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Win the prize without spending more than it&apos;s worth.
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          Explains why people keep fighting in &quot;sunk cost&quot; situations.
        </Insight>
      </Section>
    </>
  );
}
