"use client";

import { Overview, Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        The ultimate test of <strong>friendship</strong> and <strong>greed</strong>.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>There&apos;s a shared pot of <strong>50 points</strong>.</li>
          <li>Everyone secretly chooses: <strong>Split</strong> or <strong>Steal</strong>.</li>
          <li>If everyone splits, the pot is shared equally. If exactly one person steals, they take everything.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Walk away with the most money. But if two or more people steal, the stealers get <strong>nothing</strong>.
        </p>
      </Section>
    </>
  );
}
