"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

const PROACTIVE_IMG =
  "Abstract always-on sensing field: thin circular sweeps, sparse phosphor dots, and tiny HippyGhosts-like pixel silhouettes at network edges. Retro radar aesthetics with matte dark materials and restrained green accents. Immense negative space, no text.";
const AUTO_IMG =
  "Abstract pipeline theater: layered instrument modules transforming raw signal shards into stable geometric insight tokens. Retro technical mood, analog calibration marks, cool steel palette, subtle green energy paths. No text.";
const HUMAN_IMG =
  "Abstract human-in-the-loop chamber: one solid central operator node surrounded by semi-formed HippyGhosts-like pixel personas, connected with delicate signal lines and conversational ripples. Dark, cinematic, restrained glow. No text.";
const MODEL_IMG =
  "Abstract subjective model vault: nested wireframes, archival slabs, tiny persona fragments, and controlled pulse waves converging to a core. Retro sci-fi, analog precision, charcoal and oxidized green palette. No text.";

const moduleDefs = [
  { key: "proactive", img: PROACTIVE_IMG, accent: "#4ade80" },
  { key: "auto", img: AUTO_IMG, accent: "#93c5fd" },
  { key: "human", img: HUMAN_IMG, accent: "#f59e0b" },
  { key: "model", img: MODEL_IMG, accent: "#a78bfa" },
] as const;

export function ProductModulesSection() {
  const t = useTranslations("HomePageV4.ProductModules");
  const locale = useLocale();
  const [activeIdx, setActiveIdx] = useState(0);

  const active = moduleDefs[activeIdx];
  const modeHints = useMemo(
    () =>
      locale === "zh-CN"
        ? ["持续感知", "自动编排", "深度访谈", "模型调用"]
        : ["Continuous Sensing", "Autonomous Orchestration", "Deep Interview", "Model Invocation"],
    [locale],
  );

  return (
    <section className="py-20 md:py-28 bg-[#0a0a0c]">
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
          <p className="mt-4 text-zinc-300 text-sm md:text-base max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 rounded-2xl border border-white/[0.1] bg-black/25 p-3.5 md:p-4">
              <div className="space-y-2">
                {moduleDefs.map((module, index) => {
                  const selected = index === activeIdx;
                  return (
                    <button
                      key={module.key}
                      type="button"
                      onMouseEnter={() => setActiveIdx(index)}
                      onClick={() => setActiveIdx(index)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-all duration-250",
                        selected
                          ? "border-white/35 bg-white/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-IBMPlexMono text-[10px] text-white/45">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: module.accent }}
                        />
                      </div>
                      <p className="mt-1.5 text-white text-sm">{t(`${module.key}.title`)}</p>
                      <p className="mt-0.5 text-xs text-zinc-300">{modeHints[index]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 rounded-2xl border border-white/[0.1] bg-black/25 overflow-hidden">
              <div className="relative aspect-[16/9] md:aspect-[16/8.5]">
                {moduleDefs.map((module, i) => (
                  <Image
                    key={module.key}
                    src={`/api/imagegen/dev/${encodeURIComponent(module.img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="70vw"
                    priority={i === 0}
                    style={{
                      opacity: i === activeIdx ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 mb-3 bg-black/35">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: active.accent }}
                    />
                    <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-white/70">
                      {t(`${active.key}.badge`)}
                    </span>
                  </div>

                  <h3 className="font-EuclidCircularA text-2xl md:text-3xl text-white">
                    {t(`${active.key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm md:text-base text-white/65 max-w-2xl leading-relaxed">
                    {t(`${active.key}.description`)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
