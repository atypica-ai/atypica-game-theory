"use client";

import { Overview, Section, Insight, MONO, variantColor, type Variant } from "../../components/rulesHelpers";

export function RulesDisplay() {
  const scenarios = [
    {
      title: "Scenario 1 — The Lever",
      desc: "A runaway trolley is about to hit 5 people. You can pull a lever to send it down a different track — but 1 person is on that track.",
      choices: [
        { action: "Pull the lever", result: "1 dies, 5 are saved", variant: "warn" as Variant },
        { action: "Do nothing", result: "5 die", variant: "neutral" as Variant },
      ],
    },
    {
      title: "Scenario 2 — The Push",
      desc: "Same trolley, 5 people in danger. This time you're on a bridge with a large man. Pushing him off would stop the trolley — but he would die.",
      choices: [
        { action: "Push him", result: "1 dies, 5 are saved", variant: "neg" as Variant },
        { action: "Do nothing", result: "5 die", variant: "neutral" as Variant },
      ],
    },
  ];

  return (
    <>
      <Overview>
        Two thought experiments about right and wrong. There are no &quot;correct&quot; answers —
        this is about your <strong>moral instincts</strong>, not winning.
      </Overview>

      <Section label="The dilemmas">
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

      <Section label="Why it's interesting">
        <Insight>
          Both scenarios have the same tradeoff — 1 life vs 5. But most people feel differently
          about pulling a lever vs physically pushing someone. Your points reflect how consistent
          your reasoning is, not which side you pick. 1 round with group discussion first.
        </Insight>
      </Section>
    </>
  );
}
