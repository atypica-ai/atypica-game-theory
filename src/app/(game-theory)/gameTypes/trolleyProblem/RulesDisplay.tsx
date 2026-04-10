"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        A runaway train is coming. What is the <strong>value of a life</strong>?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>A trolley is heading towards <strong>5 people</strong> tied to the tracks.</li>
          <li>You are at a lever. If you pull it, the trolley switches to a track with <strong>1 person</strong>.</li>
          <li>Do you pull the lever?</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          There is no &quot;winner&quot;, only your conscience.
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          A fundamental thought experiment in ethics and AI safety.
        </Insight>
      </Section>
    </>
  );
}
