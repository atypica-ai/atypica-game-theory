"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Someone has to do the dirty work. Will it be <strong>you</strong>?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>A small task needs doing (e.g. fixing a light).</li>
          <li>If <strong>AT LEAST ONE</strong> person volunteers, everyone else gets a benefit.</li>
          <li>The volunteer pays a small cost. If <strong>NO ONE</strong> volunteers, everyone loses big.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <Insight>
          Hope someone else does it, but don&apos;t let everyone fail!
        </Insight>
      </Section>
    </>
  );
}
