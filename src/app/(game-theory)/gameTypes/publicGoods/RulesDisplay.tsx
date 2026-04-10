"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Each round you get <strong>20 tokens</strong>. Put any amount into a shared pot.</li>
          <li>The pot is <strong>multiplied by 1.6&times;</strong>, then split equally among everyone.</li>
          <li>You keep whatever you didn&apos;t contribute.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Maximize your total: tokens you kept + your share of the pot.
        </p>
      </Section>
    </>
  );
}
