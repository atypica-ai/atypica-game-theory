"use client";

import { Overview, Section, OutcomeTable, Insight, MONO, headerCell, numCell, tableBorder } from "../../components/rulesHelpers";

export function RulesDisplay() {
  return (
    <>
      <Overview>
        You&apos;re a general with <strong>6 soldiers</strong> and <strong>4 battlefields</strong>.
        Place your soldiers across the fields (0–3 per field, must total 6).
        Whoever has the most soldiers on a field wins that field.
      </Overview>

      <Section label="Scoring">
        <OutcomeTable rows={[
          { label: "Win a battlefield", pts: 10, note: "You had the most troops there", variant: "pos" },
          { label: "Tie for most troops", pts: 5, note: "Points split between tied players", variant: "warn" },
          { label: "Lose a battlefield", pts: 0, note: "Opponent had more troops", variant: "neg" },
        ]} />
      </Section>

      <Section label="Example plans">
        <table className="text-left border-collapse w-full" style={{ border: tableBorder }}>
          <thead>
            <tr>
              {["Plan", "F1", "F2", "F3", "F4", "Idea"].map((h) => (
                <th key={h} className="px-3 py-2 font-normal" style={headerCell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "All-in on two", alloc: [3, 3, 0, 0], idea: "Win 2 fields hard" },
              { name: "Spread out", alloc: [2, 2, 1, 1], idea: "Contest everything" },
              { name: "Sneak attack", alloc: [3, 1, 1, 1], idea: "One big + surprise" },
            ].map((row, idx) => (
              <tr key={row.name} style={{ background: idx % 2 === 0 ? "var(--gt-surface)" : "var(--gt-row-alt)" }}>
                <td className="px-3 py-2 text-[11px]" style={{ color: "var(--gt-t2)", borderRight: tableBorder, borderBottom: tableBorder }}>
                  {row.name}
                </td>
                {row.alloc.map((v, i) => (
                  <td
                    key={i}
                    className="px-3 py-2 text-center"
                    style={{ ...numCell, fontSize: "14px", color: v === 0 ? "var(--gt-t4)" : "var(--gt-t1)", borderRight: tableBorder, borderBottom: tableBorder }}
                  >
                    {v}
                  </td>
                ))}
                <td className="px-3 py-2 text-[10px]" style={{ color: "var(--gt-t4)", fontFamily: MONO, borderBottom: tableBorder }}>
                  {row.idea}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section label="Strategy">
        <Insight>
          Go big on a few fields to guarantee wins? Or spread thin to contest everything?
          The trick is guessing where your opponents will put their soldiers. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}
