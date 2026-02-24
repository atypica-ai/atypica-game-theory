"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function metricValue(time: number, seed: number) {
  return Math.abs(Math.sin(time * 0.6 + seed));
}

export default function SystemStageHUD({ activeScene }: { activeScene: number }) {
  const t = useTranslations("HomeAtypicaV2");
  const [time, setTime] = useState(0);
  const [clock, setClock] = useState("");

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setTime((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
      <div>
        {t("hud.sampling")}{" "}
        <span className="inline-block w-7 text-zinc-300">
          {Math.round(metricValue(time, 0.3) * 100)}%
        </span>
      </div>
      <div>
        {t("hud.feedback")}{" "}
        <span className="inline-block w-7 text-zinc-300">
          {Math.round(metricValue(time, 1.1) * 100)}%
        </span>
      </div>
      <div>
        {t("hud.confidence")}{" "}
        <span className="inline-block w-7 text-zinc-300">
          {Math.round(metricValue(time, 1.8) * 100)}%
        </span>
      </div>
      <div>
        {t("hud.state")} <span className="text-zinc-300">{t("hud.running")}</span>
      </div>
      <div className="text-zinc-600">{clock}</div>
    </div>
  );
}
