"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const NODE_POSITIONS = [
  { x: 50, y: 10, key: "values" },
  { x: 80, y: 28, key: "risk" },
  { x: 80, y: 72, key: "emotion" },
  { x: 50, y: 90, key: "decision" },
  { x: 20, y: 72, key: "social" },
  { x: 20, y: 28, key: "cognitive" },
] as const;

export function CoreTechSection() {
  const t = useTranslations("HomePageV4.CoreTech");
  const [activeNode, setActiveNode] = useState(0);

  const activeColor = useMemo(() => {
    const palette = ["#4ade80", "#93c5fd", "#f59e0b", "#f472b6", "#22d3ee", "#a78bfa"];
    return palette[activeNode % palette.length];
  }, [activeNode]);

  const features = t.raw("features") as string[];

  return (
    <section className="py-20 md:py-28 bg-[#0f1012]">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-px bg-[#2d8a4e]" />
            <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
              {t("label")}
            </span>
          </div>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight text-white",
              "text-3xl md:text-4xl lg:text-5xl",
              "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
            )}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-zinc-300 text-sm md:text-base leading-relaxed max-w-3xl">
            {t("subtitle")}
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.1] bg-black/25 backdrop-blur-sm p-4 md:p-6">
              <div className="relative w-full aspect-[1/1] max-w-[520px] mx-auto">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none">
                  {NODE_POSITIONS.map((node, i) => (
                    <g key={node.key}>
                      <line
                        x1="50"
                        y1="50"
                        x2={node.x}
                        y2={node.y}
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth="0.35"
                      />
                      {i === activeNode && (
                        <line
                          x1="50"
                          y1="50"
                          x2={node.x}
                          y2={node.y}
                          stroke={activeColor}
                          strokeWidth="0.55"
                        />
                      )}
                    </g>
                  ))}
                  <circle
                    cx="50"
                    cy="50"
                    r="18"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="31"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.35"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="41"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.35"
                  />
                </svg>

                <motion.div
                  className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 flex items-center justify-center"
                  animate={{
                    boxShadow: [`0 0 0 0 ${activeColor}55`, `0 0 0 16px ${activeColor}00`],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                >
                  <span className="font-IBMPlexMono text-xs" style={{ color: activeColor }}>
                    {t("center")}
                  </span>
                </motion.div>

                {NODE_POSITIONS.map((node, i) => {
                  const active = i === activeNode;
                  return (
                    <button
                      key={node.key}
                      type="button"
                      onMouseEnter={() => setActiveNode(i)}
                      onClick={() => setActiveNode(i)}
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 transition-all duration-250",
                        active
                          ? "border-white/45 bg-white/14"
                          : "border-white/[0.14] bg-black/35 hover:border-white/30",
                      )}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <span
                        className={cn(
                          "font-EuclidCircularA text-xs",
                          active ? "text-white" : "text-white/70",
                        )}
                      >
                        {t(`nodes.${node.key}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-white/[0.1] bg-black/25 backdrop-blur-sm p-5">
              <p className="font-IBMPlexMono text-[10px] uppercase tracking-[0.2em] text-white/45">
                Model Dimensions
              </p>
              <h3 className="mt-2 font-EuclidCircularA text-xl text-white">
                {t(`nodes.${NODE_POSITIONS[activeNode].key}`)}
              </h3>

              <div className="mt-5 space-y-2.5">
                {features.map((feature, index) => (
                  <div
                    key={feature}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 transition-all duration-250",
                      index === activeNode
                        ? "border-white/35 bg-white/10 text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-white/60",
                    )}
                  >
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
                <span className="font-IBMPlexMono text-[11px] text-white/70">{t("filing")}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
