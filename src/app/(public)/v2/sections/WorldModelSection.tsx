"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CHAPTERS,
  WORLD_MODEL_DIMENSIONS,
  WORLD_MODEL_LAYERS,
} from "../content";

const copy = CHAPTERS[2];

// Colors shared between rings and right-panel cards
const LAYER_COLORS = ["#16a34a", "#3b82f6", "#d97706", "#8b5cf6"] as const;

export default function WorldModelSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeLayer, setActiveLayer] = useState(-1);

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="light">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#15b025] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {copy.title}
          </h2>
          {copy.body.map((text) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-500"
            >
              {text}
            </p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-[1fr_320px] gap-10 items-center max-lg:grid-cols-1 max-lg:gap-8">
            {/* Orbit diagram — no wrapper box */}
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
                {/* 4 concentric layer rings */}
                {WORLD_MODEL_LAYERS.map((layer, i) => (
                  <circle
                    key={layer.key}
                    cx="50"
                    cy="50"
                    r={layer.radius}
                    stroke={LAYER_COLORS[i]}
                    strokeWidth={activeLayer === i ? "0.7" : "0.35"}
                    strokeOpacity={activeLayer === i ? 0.9 : 0.35}
                    fill="none"
                    className="cursor-pointer transition-[stroke-width,stroke-opacity] duration-200"
                    onMouseEnter={() => setActiveLayer(i)}
                    onMouseLeave={() => setActiveLayer(-1)}
                  />
                ))}

                {/* Spokes to dimension nodes */}
                {WORLD_MODEL_DIMENSIONS.map((n) => (
                  <line
                    key={n.key}
                    x1="50"
                    y1="50"
                    x2={n.x}
                    y2={n.y}
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="0.3"
                  />
                ))}
              </svg>

              {/* Center core */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-zinc-300 bg-[#fafaf8] grid place-items-center font-IBMPlexMono text-xs tracking-[0.08em]"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(22,163,74,0.15)",
                    "0 0 0 10px rgba(22,163,74,0)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              >
                <span className="text-[#16a34a] font-medium">SWM</span>
              </motion.div>

              {/* Dimension labels */}
              {WORLD_MODEL_DIMENSIONS.map((n) => (
                <span
                  key={n.key}
                  className="absolute -translate-x-1/2 -translate-y-1/2 font-IBMPlexMono text-[9px] tracking-[0.06em] text-zinc-400 pointer-events-none whitespace-nowrap"
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                >
                  {n.label}
                </span>
              ))}
            </div>

            {/* Right panel — 4 layer cards, no wrapper */}
            <div className="grid gap-2.5 self-center">
              {WORLD_MODEL_LAYERS.map((layer, i) => (
                <div
                  key={layer.key}
                  className={cn(
                    "border py-3 px-4 cursor-pointer transition-all duration-200",
                    activeLayer === i
                      ? "border-zinc-300 bg-zinc-100"
                      : "border-zinc-200 bg-transparent",
                  )}
                  onMouseEnter={() => setActiveLayer(i)}
                  onMouseLeave={() => setActiveLayer(-1)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: LAYER_COLORS[i] }}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        activeLayer === i ? "text-gray-900" : "text-zinc-600",
                      )}
                    >
                      {layer.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400 pl-[18px]">
                    {layer.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
