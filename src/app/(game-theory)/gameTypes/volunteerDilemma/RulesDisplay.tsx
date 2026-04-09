"use client";

import { Overview, Section, OutcomeTable, Insight, MONO } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        The group needs <strong>one person to step up</strong> and do a job.
        The volunteer pays a personal cost, but everyone benefits.
        If <em>nobody</em> volunteers, everyone gets nothing.
      </Overview>

      <Section label="What you get">
        <OutcomeTable rows={[
          { label: "You volunteer and get picked", pts: 20, note: "You did the job (50 reward − 30 cost)", variant: "warn" },
          { label: "You volunteer but aren't picked", pts: 50, note: "Someone else did the work — lucky you", variant: "pos" },
          { label: "You don't volunteer, someone else does", pts: 50, note: "Free ride — same reward, zero risk", variant: "pos" },
          { label: "Nobody volunteers", pts: 0, note: "Everyone loses", variant: "neg" },
        ]} />
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
          If multiple people volunteer, one is randomly chosen to do the job (and pay the cost).
        </p>
      </Section>

      <Section label="The gamble">
        <Insight>
          Sitting back and letting others volunteer is the best deal — same reward, no risk.
          But if everyone thinks that way, nobody steps up and everyone goes home with nothing. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
