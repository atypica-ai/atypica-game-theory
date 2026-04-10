"use client";

import { Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Each round, secretly choose: hunt <strong>Stag</strong> or hunt <strong>Rabbit</strong>.</li>
          <li>The stag hunt needs at least <strong>40%</strong> of the group to join.</li>
          <li>If it succeeds, <strong>everyone</strong> gets a bonus — even the rabbit hunters.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          If you both hunt Stag, you feast. If one hunts Rabbit, the Stag hunter gets <strong>nothing</strong>!
        </p>
      </Section>
    </>
  );
}
