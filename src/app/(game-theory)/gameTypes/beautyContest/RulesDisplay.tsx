"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        It&apos;s not about what you like, it&apos;s about what you think <strong>everyone else</strong> thinks.
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Everyone picks a number between <strong>0</strong> and <strong>100</strong>.</li>
          <li>We calculate the <strong>average</strong> of all chosen numbers.</li>
          <li>The target is <strong style={{ color: "var(--gt-blue)" }}>⅔ of that average</strong>.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Be the person closest to the target. If the average is 60, the target is 40!
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          Named after a Keynesian theory about stock markets.
        </Insight>
      </Section>
    </>
  );
}
