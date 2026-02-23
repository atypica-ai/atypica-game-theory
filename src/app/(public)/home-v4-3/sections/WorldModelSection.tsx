"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CHAPTERS,
  DIMENSION_PALETTE,
  WORLD_MODEL_DIMENSIONS,
  WORLD_MODEL_LAYERS,
} from "../content";

const copy = CHAPTERS[2];

const LAYER_COLORS = ["#1bff1b", "#93c5fd", "#f59e0b", "#a78bfa"] as const;

export default function WorldModelSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeNode, setActiveNode] = useState(0);
  const [activeLayer, setActiveLayer] = useState(-1);

  const activeColor = useMemo(
    () => DIMENSION_PALETTE[activeNode % DIMENSION_PALETTE.length],
    [activeNode],
  );
  const node = WORLD_MODEL_DIMENSIONS[activeNode];

  // Determine what to show in right panel: dimension or layer
  const showingLayer = activeLayer >= 0;
  const displayLayer = showingLayer ? WORLD_MODEL_LAYERS[activeLayer] : null;

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {copy.title}
          </h2>
          {copy.body.map((text) => (
            <p
              key={text}
              className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300"
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
          <div className="grid grid-cols-[7fr_5fr] gap-6 items-start max-lg:grid-cols-1">
            {/* Orbit diagram */}
            <div className="relative border border-zinc-800 bg-zinc-800/60 p-5">
              <div className="relative w-full aspect-square max-w-[520px] mx-auto">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
                  {/* 4 concentric layer rings */}
                  {WORLD_MODEL_LAYERS.map((layer, i) => (
                    <circle
                      key={layer.key}
                      cx="50"
                      cy="50"
                      r={layer.radius}
                      stroke={activeLayer === i ? LAYER_COLORS[i] : "rgba(255,255,255,0.08)"}
                      strokeWidth={activeLayer === i ? "0.6" : "0.35"}
                      fill="none"
                      className="cursor-pointer transition-[stroke] duration-200"
                      onMouseEnter={() => setActiveLayer(i)}
                      onMouseLeave={() => setActiveLayer(-1)}
                    />
                  ))}

                  {/* Spokes to dimension nodes */}
                  {WORLD_MODEL_DIMENSIONS.map((n, i) => (
                    <g key={n.key}>
                      <line
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                        stroke={i === activeNode ? activeColor : "rgba(255,255,255,0.06)"}
                        strokeWidth={i === activeNode ? "0.5" : "0.3"}
                        strokeOpacity={i === activeNode ? 0.6 : 1}
                      />
                    </g>
                  ))}
                </svg>

                {/* Layer labels positioned on rings */}
                {WORLD_MODEL_LAYERS.map((layer, i) => {
                  // Position labels at ~45 degrees on each ring
                  const angle = -45 * (Math.PI / 180);
                  const lx = 50 + layer.radius * Math.cos(angle);
                  const ly = 50 + layer.radius * Math.sin(angle);
                  return (
                    <span
                      key={layer.key}
                      className="absolute -translate-x-1/2 -translate-y-1/2 font-IBMPlexMono text-[9px] tracking-[0.1em] uppercase text-zinc-500 pointer-events-none whitespace-nowrap"
                      style={{
                        left: `${lx}%`,
                        top: `${ly}%`,
                        color: activeLayer === i ? LAYER_COLORS[i] : undefined,
                        pointerEvents: "auto",
                      }}
                      onMouseEnter={() => setActiveLayer(i)}
                      onMouseLeave={() => setActiveLayer(-1)}
                    >
                      {layer.label}
                    </span>
                  );
                })}

                {/* Center core */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-13 h-13 rounded-full border border-zinc-700 bg-zinc-700/50 grid place-items-center font-IBMPlexMono text-xs tracking-[0.08em]"
                  animate={{
                    boxShadow: [`0 0 0 0 ${activeColor}44`, `0 0 0 12px ${activeColor}00`],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                >
                  <span style={{ color: activeColor }}>SWM</span>
                </motion.div>

                {/* Dimension nodes */}
                {WORLD_MODEL_DIMENSIONS.map((n, i) => (
                  <button
                    key={n.key}
                    type="button"
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 border border-zinc-700 bg-zinc-800 py-1 px-2.5 text-xs tracking-[0.03em] cursor-pointer whitespace-nowrap text-zinc-300 transition-[border-color,background] duration-200",
                      i === activeNode && "border-zinc-500 bg-zinc-700 text-white",
                    )}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    onMouseEnter={() => {
                      setActiveNode(i);
                      setActiveLayer(-1);
                    }}
                    onClick={() => setActiveNode(i)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="border border-zinc-800 bg-zinc-800/60 p-6">
              {showingLayer && displayLayer ? (
                <>
                  <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-300">
                    Model Layer
                  </p>
                  <h3
                    className="mt-2.5 text-xl font-medium"
                    style={{ color: LAYER_COLORS[activeLayer] }}
                  >
                    {displayLayer.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                    {displayLayer.description}
                  </p>
                  <p
                    className="mt-3 font-IBMPlexMono text-xs"
                    style={{ color: LAYER_COLORS[activeLayer] }}
                  >
                    &rarr; {displayLayer.product}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-300">
                    Dimension
                  </p>
                  <h3 className="mt-2.5 text-xl font-medium" style={{ color: activeColor }}>
                    {node.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{node.description}</p>
                </>
              )}

              {/* Layer list */}
              <div className="mt-5 grid gap-1.5">
                {WORLD_MODEL_LAYERS.map((layer, i) => (
                  <button
                    key={layer.key}
                    type="button"
                    className={cn(
                      "flex items-center gap-2.5 border border-zinc-800 bg-zinc-800/50 py-2.5 px-3.5 text-sm text-zinc-300 cursor-pointer transition-[border-color,background,color] duration-200",
                      activeLayer === i && "border-zinc-600 bg-zinc-700 text-white",
                    )}
                    onMouseEnter={() => setActiveLayer(i)}
                    onMouseLeave={() => setActiveLayer(-1)}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: LAYER_COLORS[i] }}
                    />
                    <span>{layer.label}</span>
                    <span className="ml-auto font-IBMPlexMono text-xs text-zinc-300">
                      {layer.product}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dimension list */}
              <div className="mt-4 grid gap-1.5">
                <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-300">
                  6 Dimensions
                </p>
                {WORLD_MODEL_DIMENSIONS.map((dim, i) => (
                  <button
                    key={dim.key}
                    type="button"
                    className={cn(
                      "flex items-center gap-2.5 border border-zinc-800 bg-zinc-800/50 py-2.5 px-3.5 text-sm text-zinc-300 cursor-pointer transition-[border-color,background,color] duration-200",
                      activeNode === i && !showingLayer && "border-zinc-600 bg-zinc-700 text-white",
                    )}
                    onMouseEnter={() => {
                      setActiveNode(i);
                      setActiveLayer(-1);
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: DIMENSION_PALETTE[i] }}
                    />
                    <span>{dim.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
