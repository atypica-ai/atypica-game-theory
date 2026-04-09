"use client";

import { Overview, Section, OutcomeTable, Insight } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        Two players split <strong>100 points</strong>.
        One person proposes the split, the other says <strong>accept</strong> or <strong>reject</strong>.
        If rejected, <em>both get zero</em>.
      </Overview>

      <Section label="The two roles">
        <div className="flex gap-4">
          <div className="flex-1 border p-4" style={{ borderColor: "var(--gt-border)", borderRadius: "0.375rem", background: "var(--gt-surface)" }}>
            <span className="text-[12px] font-[600] block mb-1" style={{ color: "var(--gt-t1)" }}>Proposer (goes first)</span>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
              Decide how to split 100 points between you and the other player.
            </p>
          </div>
          <div className="flex-1 border p-4" style={{ borderColor: "var(--gt-border)", borderRadius: "0.375rem", background: "var(--gt-surface)" }}>
            <span className="text-[12px] font-[600] block mb-1" style={{ color: "var(--gt-t1)" }}>Responder (goes second)</span>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
              See the offer. Accept it (you both get paid) or reject it (nobody gets anything).
            </p>
          </div>
        </div>
      </Section>

      <Section label="What happens">
        <OutcomeTable rows={[
          { label: "Responder accepts", pts: "the split", note: "Both players get their share", variant: "pos" },
          { label: "Responder rejects", pts: "0 / 0", note: "Nobody gets anything", variant: "neg" },
        ]} />
      </Section>

      <Section label="The mind game">
        <Insight>
          Logically, the responder should accept any offer above 0 — something beats nothing.
          But in practice, people reject &quot;unfair&quot; offers to punish greedy proposers,
          even though it costs them too. 1 round — choose wisely.
        </Insight>
      </Section>
    </>
  );
}
