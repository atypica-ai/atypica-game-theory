"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>One player proposes how to split <strong>100 points</strong>.</li>
          <li>The other player can <strong>Accept</strong> or <strong>Reject</strong>.</li>
          <li>If rejected, <strong>both</strong> get zero.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Strike a deal. If it falls through, nobody gets anything.
        </p>
      </Section>
    </>
  );
}
