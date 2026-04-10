"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Go for the <strong>big prize</strong> together, or play it safe alone?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>You can hunt a <strong>STAG</strong> (huge reward) or a <strong>HARE</strong> (small reward).</li>
          <li>To catch a STAG, you <strong>NEED</strong> your partner to help.</li>
          <li>To catch a HARE, you can do it alone.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          If you both hunt Stag, you feast. If one hunts Hare, the Stag hunter gets <strong>nothing</strong>!
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          A classic model for social cooperation.
        </Insight>
      </Section>
    </>
  );
}
