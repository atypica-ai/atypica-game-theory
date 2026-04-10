"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        How much is <strong>&quot;fair&quot;</strong> enough for you?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Player A is given <strong>$100</strong>.</li>
          <li>Player A offers a portion (e.g. $20) to Player B.</li>
          <li>Player B can <strong>ACCEPT</strong> or <strong>REJECT</strong>.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          If B accepts, the split happens. If B rejects, <strong>BOTH</strong> get $0.
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          People often reject &quot;unfair&quot; offers even if it means getting nothing.
        </Insight>
      </Section>
    </>
  );
}
