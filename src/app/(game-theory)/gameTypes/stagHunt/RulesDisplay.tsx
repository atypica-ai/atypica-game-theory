"use client";

import { Overview, Section, OutcomeTable, Insight, MONO } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Your group goes hunting together. Each round, secretly pick:
        hunt <strong>Stag</strong> (big reward, but you need help) or
        hunt <strong>Rabbit</strong> (small reward, guaranteed).
        If the stag hunt succeeds, <em>everyone</em> gets a bonus — even the rabbit hunters.
      </Overview>

      <Section label="What you get">
        <OutcomeTable rows={[
          { label: "Pick Stag, enough hunters join", pts: 25, note: "Group hunt pays off", variant: "pos" },
          { label: "Pick Stag, not enough hunters", pts: 0, note: "You came home empty-handed", variant: "neg" },
          { label: "Pick Rabbit, stag hunt succeeds", pts: 35, note: "Your rabbit + the stag bonus!", variant: "warn" },
          { label: "Pick Rabbit, stag hunt fails", pts: 10, note: "At least you caught a rabbit", variant: "neutral" },
        ]} />
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
          The stag hunt needs at least 40% of the group to join (e.g. 2 out of 4 players).
        </p>
      </Section>

      <Section label="The catch">
        <Insight>
          Rabbit hunters get a free bonus when others risk it on the stag.
          So why volunteer for the risky hunt when you can play it safe and still win?
          3 rounds. All choices revealed after each.
        </Insight>
      </Section>
    </>
  );
}
