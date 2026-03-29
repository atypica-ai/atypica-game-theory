"use client";

import { motion } from "motion/react";

export interface ActionPoint {
  label: string;
  human: number;
  persona: number;
}

export interface RoundPoint {
  round: number;
  human: number;
  persona: number;
}

export interface GameChartData {
  displayName: string;
  accentColor: string;
  humanSource: string;
  personaSource: string;
  actions: ActionPoint[];
  byRound: RoundPoint[];
}

const HUMAN_COLOR = "#3b82f6";
const PERSONA_COLOR_SOLID = "#1bff1b";

// ── Bar Chart ──────────────────────────────────────────────────

function BarRow({
  label,
  human,
  persona,
  delay,
}: {
  label: string;
  human: number;
  persona: number;
  delay: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600">
        {label}
      </span>
      {/* Human bar */}
      <div className="flex items-center gap-3">
        <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] text-zinc-700 w-14 shrink-0">
          HUMAN
        </span>
        <div className="flex-1 h-[3px] bg-zinc-900 relative">
          <motion.div
            className="absolute left-0 top-0 h-full"
            style={{ backgroundColor: HUMAN_COLOR }}
            initial={{ width: 0 }}
            animate={{ width: `${human * 100}%` }}
            transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
        <span
          className="font-IBMPlexMono text-[10px] tabular-nums w-8 text-right shrink-0"
          style={{ color: HUMAN_COLOR }}
        >
          {Math.round(human * 100)}%
        </span>
      </div>
      {/* Persona bar */}
      <div className="flex items-center gap-3">
        <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] text-zinc-700 w-14 shrink-0">
          PERSONA
        </span>
        <div className="flex-1 h-[3px] bg-zinc-900 relative">
          <motion.div
            className="absolute left-0 top-0 h-full"
            style={{ backgroundColor: PERSONA_COLOR_SOLID, opacity: 0.4 }}
            initial={{ width: 0 }}
            animate={{ width: `${persona * 100}%` }}
            transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
        <span
          className="font-IBMPlexMono text-[10px] tabular-nums w-8 text-right shrink-0"
          style={{ color: PERSONA_COLOR_SOLID }}
        >
          {Math.round(persona * 100)}%
        </span>
      </div>
    </div>
  );
}

// ── Line Chart ─────────────────────────────────────────────────

function LineChart({ byRound }: { byRound: RoundPoint[] }) {
  const W = 260;
  const H = 80;
  const PAD = { top: 8, right: 8, bottom: 20, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xOf = (i: number) => PAD.left + (i / (byRound.length - 1)) * chartW;
  const yOf = (v: number) => PAD.top + (1 - v) * chartH;

  const toPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i)},${yOf(v)}`).join(" ");

  const humanPath = toPath(byRound.map((r) => r.human));
  const personaPath = toPath(byRound.map((r) => r.persona));

  // Rough path length for strokeDasharray animation
  const pathLen = chartW * 1.15;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ overflow: "visible" }}
      >
        {/* Y gridlines at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map((v) => (
          <line
            key={v}
            x1={PAD.left}
            y1={yOf(v)}
            x2={W - PAD.right}
            y2={yOf(v)}
            stroke="#27272a"
            strokeWidth={0.5}
          />
        ))}

        {/* Y axis labels */}
        {[0, 0.5, 1].map((v) => (
          <text
            key={v}
            x={PAD.left - 4}
            y={yOf(v) + 3}
            textAnchor="end"
            fontSize={7}
            fontFamily="IBMPlexMono"
            fill="#52525b"
          >
            {Math.round(v * 100)}%
          </text>
        ))}

        {/* Human line */}
        <motion.path
          d={humanPath}
          fill="none"
          stroke={HUMAN_COLOR}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ strokeDasharray: pathLen, strokeDashoffset: pathLen }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        />

        {/* Persona line */}
        <motion.path
          d={personaPath}
          fill="none"
          stroke={PERSONA_COLOR_SOLID}
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ strokeDasharray: pathLen, strokeDashoffset: pathLen }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        />

        {/* Data points */}
        {byRound.map((r, i) => (
          <g key={r.round}>
            <circle cx={xOf(i)} cy={yOf(r.human)} r={2.5} fill={HUMAN_COLOR} />
            <circle
              cx={xOf(i)}
              cy={yOf(r.persona)}
              r={2.5}
              fill={PERSONA_COLOR_SOLID}
              fillOpacity={0.5}
            />
          </g>
        ))}

        {/* X axis round labels */}
        {byRound.map((r, i) => (
          <text
            key={r.round}
            x={xOf(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize={7}
            fontFamily="IBMPlexMono"
            fill="#52525b"
          >
            R{r.round}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[1.5px] inline-block" style={{ backgroundColor: HUMAN_COLOR }} />
          <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] uppercase text-zinc-600">
            Human
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-[1.5px] inline-block"
            style={{ backgroundColor: PERSONA_COLOR_SOLID, opacity: 0.5 }}
          />
          <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] uppercase text-zinc-600">
            Persona
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────

export function DistributionChart({ data }: { data: GameChartData }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Bar rows */}
      <div className="flex flex-col gap-4">
        {data.actions.map((action, i) => (
          <BarRow
            key={action.label}
            label={action.label}
            human={action.human}
            persona={action.persona}
            delay={0.2 + i * 0.15}
          />
        ))}
      </div>

      {/* Thin divider */}
      <div className="h-px bg-zinc-800" />

      {/* Round-by-round line */}
      <div>
        <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 block mb-2">
          Cooperation over rounds
        </span>
        <LineChart byRound={data.byRound} />
      </div>
    </div>
  );
}
