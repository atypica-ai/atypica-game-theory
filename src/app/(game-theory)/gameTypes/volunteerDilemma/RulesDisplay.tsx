"use client";

import { Overview, Section } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Someone has to do the dirty work. Will it be <strong>you</strong>?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>The group needs <strong>at least one volunteer</strong> to step up.</li>
          <li>If someone volunteers, everyone gets the reward — but the volunteer pays a cost.</li>
          <li>If <strong>nobody</strong> volunteers, everyone gets nothing.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Hope someone else does it — but don&apos;t let everyone fail.
        </p>
      </Section>
    </>
  );
}
