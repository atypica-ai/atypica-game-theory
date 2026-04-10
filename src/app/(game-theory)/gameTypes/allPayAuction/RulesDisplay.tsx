"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>A prize worth <strong>100 points</strong> is up for grabs.</li>
          <li>Everyone secretly bids <strong>0–150</strong>. Highest bid wins.</li>
          <li><strong>Everyone</strong> pays their bid — win or lose.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Win the prize without spending more than it&apos;s worth.
        </p>
      </Section>
    </>
  );
}
