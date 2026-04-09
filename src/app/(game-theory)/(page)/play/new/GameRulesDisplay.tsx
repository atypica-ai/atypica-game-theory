"use client";

import { ReactNode } from "react";

// ── Shared styling constants ─────────────────────────────────────────────────

const MONO = "IBMPlexMono, monospace";
const SERIF = "'Instrument Serif', Georgia, serif";

const tableBorder = "1px solid var(--gt-border)";
const headerCell: React.CSSProperties = {
  background: "var(--gt-row-alt)",
  color: "var(--gt-t3)",
  fontFamily: MONO,
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRight: tableBorder,
  borderBottom: tableBorder,
};
const numCell: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "var(--gt-tracking-tight)",
  lineHeight: 1,
};

// ── Shared helper components ─────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <span
        className="text-[11px] uppercase block mb-3"
        style={{ color: "var(--gt-t4)", fontFamily: MONO, letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Overview({ children }: { children: ReactNode }) {
  return (
    <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--gt-t2)" }}>
      {children}
    </p>
  );
}

function Insight({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[14px] leading-relaxed mt-1"
      style={{ color: "var(--gt-t3)", fontFamily: SERIF, fontStyle: "italic" }}
    >
      {children}
    </p>
  );
}

type Variant = "pos" | "neg" | "warn" | "neutral";
function variantColor(v: Variant) {
  return v === "pos" ? "var(--gt-pos)" : v === "neg" ? "var(--gt-neg)" : v === "warn" ? "var(--gt-warn)" : "var(--gt-t1)";
}

function OutcomeTable({ rows }: { rows: { label: string; pts: number | string; note: string; variant: Variant }[] }) {
  return (
    <table className="text-left border-collapse w-full" style={{ border: tableBorder }}>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.label} style={{ background: idx % 2 === 0 ? "var(--gt-surface)" : "var(--gt-row-alt)" }}>
            <td className="px-3 py-2 text-[11px]" style={{ color: "var(--gt-t2)", borderRight: tableBorder, borderBottom: tableBorder }}>
              {row.label}
            </td>
            <td className="px-4 py-2" style={{ ...numCell, color: variantColor(row.variant), borderRight: tableBorder, borderBottom: tableBorder }}>
              {row.pts}
            </td>
            <td className="px-3 py-2 text-[10px]" style={{ color: "var(--gt-t4)", fontFamily: MONO, borderBottom: tableBorder }}>
              {row.note}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Per-game rules ───────────────────────────────────────────────────────────

function PrisonerDilemmaRules() {
  const payoffs: Record<string, Record<string, { you: number; them: number }>> = {
    cooperate: { cooperate: { you: 51, them: 51 }, defect: { you: 22, them: 63 } },
    defect: { cooperate: { you: 63, them: 22 }, defect: { you: 39, them: 39 } },
  };

  return (
    <>
      <Overview>
        You and one opponent each choose to <strong>Cooperate</strong> or <strong>Defect</strong> — simultaneously,
        without seeing each other's choice. Your points depend on the combination of both decisions.
      </Overview>

      <Section label="Payoff Matrix">
        <table className="text-left border-collapse w-fit" style={{ border: tableBorder }}>
          <thead>
            <tr>
              <th className="px-3 py-2" style={{ ...headerCell, fontWeight: "normal" }}>
                <span className="text-[9px]" style={{ color: "var(--gt-t4)" }}>You ↓ · Them →</span>
              </th>
              {["Cooperate", "Defect"].map((col) => (
                <th key={col} className="px-4 py-2 font-normal" style={headerCell}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["cooperate", "defect"] as const).map((row) => (
              <tr key={row}>
                <td className="px-3 py-2 font-normal" style={headerCell}>
                  {row.charAt(0).toUpperCase() + row.slice(1)}
                </td>
                {(["cooperate", "defect"] as const).map((col) => {
                  const cell = payoffs[row][col];
                  const isTempt = row === "defect" && col === "cooperate";
                  const isSucker = row === "cooperate" && col === "defect";
                  return (
                    <td
                      key={col}
                      className="px-4 py-2"
                      style={{
                        background: isTempt ? "var(--gt-pos-bg)" : isSucker ? "var(--gt-neg-bg)" : "var(--gt-surface)",
                        borderRight: tableBorder,
                        borderBottom: tableBorder,
                      }}
                    >
                      <span className="block" style={{ ...numCell, color: isTempt ? "var(--gt-pos)" : isSucker ? "var(--gt-neg)" : "var(--gt-t1)" }}>
                        {cell.you}
                      </span>
                      <span className="text-[10px] mt-0.5 block" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
                        / {cell.them}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
          Row = your choice · Col = their choice · large = your points
        </p>
      </Section>

      <Section label="How it plays">
        <Insight>
          Mutual cooperation pays more than mutual defection — but defecting is always tempting.
          4 rounds. After each round, both choices are revealed.
        </Insight>
      </Section>
    </>
  );
}

function StagHuntRules() {
  return (
    <>
      <Overview>
        A group hunting game. Each round, choose <strong>Stag</strong> (risky group hunt) or <strong>Rabbit</strong> (safe solo hunt).
        The stag hunt is a public good — if it succeeds, <em>everyone</em> benefits, even rabbit hunters.
      </Overview>

      <Section label="Payoffs">
        <OutcomeTable rows={[
          { label: "Stag · hunt succeeds (≥T hunters)", pts: 25, note: "cooperative reward", variant: "pos" },
          { label: "Stag · hunt fails (<T hunters)", pts: 0, note: "wasted effort", variant: "neg" },
          { label: "Rabbit · hunt succeeds", pts: 35, note: "10 private + 25 free-ride", variant: "warn" },
          { label: "Rabbit · hunt fails", pts: 10, note: "safe private reward", variant: "neutral" },
        ]} />
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
          T = 40% of group, rounded up (e.g. 2 of 4 players)
        </p>
      </Section>

      <Section label="The dilemma">
        <Insight>
          Rabbit hunters pocket their private reward AND the public bonus if the stag hunt succeeds.
          Why risk hunting stag when you can free-ride? 3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function BeautyContestRules() {
  return (
    <>
      <Overview>
        Everyone secretly picks a number from <strong>0 to 100</strong>. The winner is the player
        whose number is closest to <strong>⅔ of the group average</strong>.
      </Overview>

      <Section label="Example">
        <OutcomeTable rows={[
          { label: "4 players pick: 20, 40, 60, 80", pts: "avg 50", note: "group average", variant: "neutral" },
          { label: "Target = ⅔ × 50", pts: "≈ 33", note: "⅔ of average", variant: "pos" },
          { label: "Player with 40 wins", pts: 50, note: "closest to target", variant: "pos" },
        ]} />
      </Section>

      <Section label="Scoring">
        <Insight>
          Winner(s) share a 50-point pot. Everyone else earns 0. Think about what others will pick — then aim lower.
          3 rounds — watch how the average drops.
        </Insight>
      </Section>
    </>
  );
}

function GoldenBallRules() {
  return (
    <>
      <Overview>
        Each round, every player secretly declares <strong>Split</strong> or <strong>Steal</strong>.
        The pot is worth 50 points.
      </Overview>

      <Section label="Outcomes">
        <OutcomeTable rows={[
          { label: "Nobody steals (all split)", pts: "50 ÷ N", note: "shared equally", variant: "pos" },
          { label: "Exactly 1 stealer", pts: 50, note: "stealer takes all, splitters get 0", variant: "neg" },
          { label: "2+ stealers", pts: 0, note: "stealers get 0, splitters share pot", variant: "warn" },
        ]} />
      </Section>

      <Section label="The tension">
        <Insight>
          One stealer takes everything — but if two people steal, they both get nothing and the splitters win.
          3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function AllPayAuctionRules() {
  return (
    <>
      <Overview>
        Each round, secretly bid <strong>0–150</strong> for a prize worth <strong>100 points</strong>.
        The highest bidder wins the prize — but <em>everyone pays their bid</em>, winners and losers alike.
      </Overview>

      <Section label="Payoffs">
        <OutcomeTable rows={[
          { label: "Highest bidder (winner)", pts: "100 − bid", note: "wins prize, pays bid", variant: "pos" },
          { label: "All other bidders (losers)", pts: "− bid", note: "no prize, still pay", variant: "neg" },
          { label: "Tied highest bidders", pts: "split − bid", note: "split 100, each pays full bid", variant: "warn" },
        ]} />
      </Section>

      <Section label="The trap">
        <Insight>
          Overbidding destroys value. Underbidding means you lose. Even losers pay — be careful of the escalation trap.
          3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function VolunteerDilemmaRules() {
  return (
    <>
      <Overview>
        Someone must <strong>volunteer</strong> to produce a public good — but the volunteer pays a cost.
        If nobody volunteers, everyone gets nothing.
      </Overview>

      <Section label="Payoffs">
        <OutcomeTable rows={[
          { label: "Selected volunteer", pts: 20, note: "50 benefit − 30 cost", variant: "warn" },
          { label: "Non-selected volunteers", pts: 50, note: "benefit, no cost", variant: "pos" },
          { label: "Non-volunteers (free-riders)", pts: 50, note: "benefit for free", variant: "pos" },
          { label: "Nobody volunteers", pts: 0, note: "disaster — all get 0", variant: "neg" },
        ]} />
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>
          When multiple players volunteer, ONE is randomly selected to pay the cost.
        </p>
      </Section>

      <Section label="The dilemma">
        <Insight>
          Free-riders earn the same as non-selected volunteers — so why volunteer?
          But if nobody does, everyone loses. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function PublicGoodsRules() {
  return (
    <>
      <Overview>
        Each round you start with <strong>20 tokens</strong>. Decide how many to contribute to a shared pool.
        The pool is multiplied by <strong>1.6×</strong> and split equally among all players — even those who contributed nothing.
      </Overview>

      <Section label="Payoff formula">
        <div
          className="px-4 py-3 text-[13px] mb-3"
          style={{ background: "var(--gt-row-alt)", border: tableBorder, borderRadius: "0.25rem", fontFamily: MONO, color: "var(--gt-t1)" }}
        >
          Your payoff = (20 − contribution) + (total pool × 1.6 ÷ N)
        </div>
        <OutcomeTable rows={[
          { label: "Everyone contributes 20", pts: 32, note: "pool = 128, each gets 32", variant: "pos" },
          { label: "3 contribute 20, 1 contributes 0", pts: "24 / 44", note: "contributors 24, free-rider 44", variant: "warn" },
          { label: "Nobody contributes", pts: 20, note: "everyone keeps 20", variant: "neutral" },
        ]} />
      </Section>

      <Section label="The tension">
        <Insight>
          Free-riders always earn more than contributors in the same round — but if everyone free-rides,
          nobody benefits from the multiplier. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function ColonelBlottoRules() {
  return (
    <>
      <Overview>
        You are a commander distributing <strong>6 troops</strong> across <strong>4 battlefields</strong>.
        Each battlefield can receive 0–3 troops. The player with the most troops on a battlefield wins it.
      </Overview>

      <Section label="Scoring">
        <OutcomeTable rows={[
          { label: "Win a battlefield (most troops)", pts: 10, note: "per battlefield won", variant: "pos" },
          { label: "Tie for most troops", pts: 5, note: "split 10 points", variant: "warn" },
          { label: "Lose a battlefield", pts: 0, note: "fewer troops", variant: "neg" },
        ]} />
      </Section>

      <Section label="Example allocations">
        <table className="text-left border-collapse w-full" style={{ border: tableBorder }}>
          <thead>
            <tr>
              {["Strategy", "BF 1", "BF 2", "BF 3", "BF 4"].map((h) => (
                <th key={h} className="px-3 py-2 font-normal" style={headerCell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Spread", alloc: [2, 2, 1, 1] },
              { name: "Concentrate", alloc: [3, 3, 0, 0] },
              { name: "Weighted", alloc: [3, 2, 1, 0] },
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
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section label="Strategy">
        <Insight>
          Concentrate to win decisive battles, or spread to contest more? Predict where opponents will deploy.
          Troops total must equal 6. 3 rounds.
        </Insight>
      </Section>
    </>
  );
}

function TrolleyProblemRules() {
  const scenarios = [
    {
      title: "Classic Trolley",
      desc: "A trolley speeds toward 5 people. You can pull a lever to divert it to a side track where 1 person is tied.",
      choices: [
        { action: "Pull lever", result: "Kill 1, save 5", variant: "warn" as Variant },
        { action: "Do nothing", result: "5 die", variant: "neutral" as Variant },
      ],
    },
    {
      title: "Fat Man Variant",
      desc: "A trolley speeds toward 5 people. You can push a large man off a bridge to stop the trolley. He will die.",
      choices: [
        { action: "Push", result: "Kill 1, save 5 (use person as means)", variant: "neg" as Variant },
        { action: "Do nothing", result: "5 die", variant: "neutral" as Variant },
      ],
    },
  ];

  return (
    <>
      <Overview>
        Two moral dilemmas. This is <strong>observational research on ethical intuitions</strong> — not a competitive game.
        Points reflect consistency and alignment with ethical frameworks.
      </Overview>

      <Section label="Scenarios">
        <div className="flex flex-col gap-4">
          {scenarios.map((s) => (
            <div key={s.title} className="border p-4" style={{ borderColor: "var(--gt-border)", borderRadius: "0.375rem", background: "var(--gt-surface)" }}>
              <span className="text-[12px] font-[600] block mb-1" style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}>
                {s.title}
              </span>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--gt-t2)" }}>{s.desc}</p>
              <div className="flex gap-3">
                {s.choices.map((c) => (
                  <div
                    key={c.action}
                    className="flex-1 px-3 py-2 text-center border"
                    style={{ borderColor: "var(--gt-border)", borderRadius: "0.25rem", background: "var(--gt-row-alt)" }}
                  >
                    <span className="text-[12px] font-[500] block" style={{ color: variantColor(c.variant) }}>{c.action}</span>
                    <span className="text-[10px] block mt-0.5" style={{ color: "var(--gt-t4)", fontFamily: MONO }}>{c.result}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Ethical frameworks">
        <OutcomeTable rows={[
          { label: "Utilitarian", pts: "Both", note: "maximize lives saved", variant: "pos" },
          { label: "Deontological", pts: "Neither", note: "never actively kill", variant: "neutral" },
          { label: "Doctrine of Double Effect", pts: "Lever only", note: "redirect ok, using person not ok", variant: "warn" },
        ]} />
        <Insight>1 round. Discussion before voting.</Insight>
      </Section>
    </>
  );
}

function UltimatumGameRules() {
  return (
    <>
      <Overview>
        Two players divide <strong>100 points</strong>. One proposes a split, the other accepts or rejects.
        If rejected, <em>both get nothing</em>.
      </Overview>

      <Section label="Roles">
        <div className="flex gap-4">
          <div className="flex-1 border p-4" style={{ borderColor: "var(--gt-border)", borderRadius: "0.375rem", background: "var(--gt-surface)" }}>
            <span className="text-[12px] font-[600] block mb-1" style={{ color: "var(--gt-t1)" }}>Proposer (acts first)</span>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
              Choose how to split 100 points. E.g., keep 60, offer 40.
            </p>
          </div>
          <div className="flex-1 border p-4" style={{ borderColor: "var(--gt-border)", borderRadius: "0.375rem", background: "var(--gt-surface)" }}>
            <span className="text-[12px] font-[600] block mb-1" style={{ color: "var(--gt-t1)" }}>Responder (acts second)</span>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--gt-t2)" }}>
              See the offer, then accept or reject. Reject = both get 0.
            </p>
          </div>
        </div>
      </Section>

      <Section label="Payoffs">
        <OutcomeTable rows={[
          { label: "Responder accepts", pts: "split", note: "both get proposed amounts", variant: "pos" },
          { label: "Responder rejects", pts: 0, note: "both get nothing", variant: "neg" },
        ]} />
      </Section>

      <Section label="The tension">
        <Insight>
          Game theory says accept any offer above 0. In reality, humans reject offers below 30% as unfair.
          1 round — make it count.
        </Insight>
      </Section>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function GameRulesDisplay({ gameTypeName }: { gameTypeName: string }) {
  switch (gameTypeName) {
    case "prisoner-dilemma": return <PrisonerDilemmaRules />;
    case "stag-hunt": return <StagHuntRules />;
    case "beauty-contest": return <BeautyContestRules />;
    case "golden-ball": return <GoldenBallRules />;
    case "all-pay-auction": return <AllPayAuctionRules />;
    case "volunteer-dilemma": return <VolunteerDilemmaRules />;
    case "public-goods": return <PublicGoodsRules />;
    case "colonel-blotto": return <ColonelBlottoRules />;
    case "trolley-problem": return <TrolleyProblemRules />;
    case "ultimatum-game": return <UltimatumGameRules />;
    default: return <p style={{ color: "var(--gt-t3)" }}>Rules not available.</p>;
  }
}
