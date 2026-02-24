"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/** Pseudo-random high-frequency value generator */
function fastMetric(time: number, seed: number, base: number, range: number) {
  // Combine multiple sine waves at different frequencies for chaotic feel
  const v =
    Math.sin(time * 3.7 + seed) * 0.4 +
    Math.sin(time * 7.3 + seed * 2.1) * 0.3 +
    Math.sin(time * 13.1 + seed * 0.7) * 0.2 +
    Math.sin(time * 23.7 + seed * 3.3) * 0.1;
  return Math.round(base + v * range);
}

/** Counter that ramps up over time */
function rampMetric(time: number, seed: number, rate: number) {
  const base = Math.floor(time * rate);
  const jitter = Math.floor(Math.sin(time * 11.3 + seed) * 2);
  return base + jitter;
}

type MetricDef = {
  key: string;
  getValue: (time: number) => string;
};

const METRICS: MetricDef[] = [
  {
    key: "personas",
    getValue: (t) => String(rampMetric(t, 0.3, 47)).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  },
  {
    key: "interviews",
    getValue: (t) => String(rampMetric(t, 1.7, 12)).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  },
  { key: "signals", getValue: (t) => `${fastMetric(t, 2.1, 847, 120)}` },
  {
    key: "insights",
    getValue: (t) => String(rampMetric(t, 3.9, 8)).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  },
  { key: "panels", getValue: (t) => `${fastMetric(t, 5.2, 64, 18)}` },
];

export default function SystemStageHUD({ activeScene }: { activeScene: number }) {
  const t = useTranslations("HomeAtypicaV2");
  const [time, setTime] = useState(0);
  const [clock, setClock] = useState("");
  const rafRef = useRef(0);

  // Explicit label lookup to avoid next-intl dynamic key typing issues
  const metricLabels: Record<string, string> = {
    personas: t("hud.personas"),
    interviews: t("hud.interviews"),
    signals: t("hud.signals"),
    insights: t("hud.insights"),
    panels: t("hud.panels"),
  };

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setTime((now - start) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 border border-zinc-800 bg-[rgba(9,9,11,0.75)] backdrop-blur-sm px-3 py-2.5 grid gap-1 font-IBMPlexMono text-[10px] tracking-[0.08em] uppercase text-zinc-500 max-lg:hidden">
      <div>
        {t("hud.scene")}{" "}
        <span className="inline-block w-7 text-zinc-300">
          {String(activeScene).padStart(2, "0")}
        </span>
      </div>
      {METRICS.map((m) => (
        <div key={m.key}>
          {metricLabels[m.key]}{" "}
          <span className="inline-block min-w-[3ch] text-zinc-300 tabular-nums text-right">
            {m.getValue(time)}
          </span>
        </div>
      ))}
      <div>
        {t("hud.state")} <span className="text-[#1bff1b]">{t("hud.running")}</span>
      </div>
      <div className="text-zinc-600">{clock}</div>
    </div>
  );
}
