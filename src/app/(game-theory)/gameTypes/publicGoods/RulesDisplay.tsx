"use client";

import { Overview, Section, OutcomeTable, Insight, MONO, tableBorder } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Each round you get <strong>20 tokens</strong>.
        Put as many as you want into a shared pot (keep the rest).
        The pot is <strong>multiplied by 1.6x</strong> then split equally among <em>everyone</em> — even those who put in nothing.
      </Overview>

      <Section label="How the math works">
        <div
          className="px-4 py-3 text-[13px] mb-3"
          style={{ background: "var(--gt-row-alt)", border: tableBorder, borderRadius: "0.25rem", fontFamily: MONO, color: "var(--gt-t1)" }}
        >
          You get = tokens you kept + your share of the multiplied pot
        </div>
        <OutcomeTable rows={[
          { label: "Everyone puts in all 20", pts: "32 each", note: "Pot grows big — best for the group", variant: "pos" },
          { label: "You put in 0, others put in 20", pts: "44 / 24", note: "You keep 20 + get share = 44!", variant: "warn" },
          { label: "Nobody puts in anything", pts: "20 each", note: "No pot, everyone just keeps their 20", variant: "neutral" },
        ]} />
      </Section>

      <Section label="The temptation">
        <Insight>
          Contributing nothing and pocketing your 20 tokens while everyone else fills the pot
          is the most profitable move. But if everyone does it, the pot stays empty
          and nobody gets the bonus. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
