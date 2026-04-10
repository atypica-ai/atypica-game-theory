"use client";

import { Overview, Section, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Will you contribute to the community or be a <strong>free rider</strong>?
      </Overview>

      <Section label="How to play">
        <ol className="list-decimal list-inside space-y-1 text-[13px]" style={{ color: "var(--gt-t2)" }}>
          <li>Everyone starts with <strong>$10</strong>.</li>
          <li>You can secretly put any amount into a &quot;Public Pot&quot;.</li>
          <li>The pot is <strong>doubled</strong> and then split <strong>EQUALLY</strong> among everyone.</li>
        </ol>
      </Section>

      <Section label="The goal">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
          Maximize your total money (your kept cash + your share of the pot).
        </p>
      </Section>

      <Section label="Fun fact">
        <Insight>
          The best outcome for the group is everyone contributing everything!
        </Insight>
      </Section>
    </>
  );
}
