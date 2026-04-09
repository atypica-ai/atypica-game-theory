"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        A prize worth <strong>100 points</strong> is up for auction.
        Everyone secretly places a bid (0–150).
        Highest bid wins — but <strong>everyone pays their bid</strong>, win or lose.
      </Overview>

      <Section label="What you get">
        <OutcomeTable rows={[
          { label: "You bid highest", pts: "100 − bid", note: "Prize minus what you paid", variant: "pos" },
          { label: "You don't win", pts: "− bid", note: "No prize, but you still pay!", variant: "neg" },
          { label: "Tied for highest", pts: "split − bid", note: "Split prize, each pays full bid", variant: "warn" },
        ]} />
      </Section>

      <Section label="Watch out">
        <Insight>
          This isn&apos;t a normal auction — losers don&apos;t get their money back.
          Bid too high and you overpay. Bid too low and you lose your bid for nothing.
          The only safe bid is 0 — but then you can&apos;t win. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
