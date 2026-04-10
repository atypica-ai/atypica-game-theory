"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>You face two scenarios — each asks you to choose between action and inaction.</li>
          <li><strong>The Lever</strong>: pull a lever to divert the trolley — save 5, but 1 dies.</li>
          <li><strong>The Push</strong>: push someone onto the tracks to stop it — same tradeoff, different act.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          There is no &quot;winner&quot; — only your conscience.
        </p>
      </Section>
    </>
  );
}
