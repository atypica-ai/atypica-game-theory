"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

const PERSONA_IMG =
  "Abstract persona archive: dense field of tiny HippyGhosts-like pixel silhouettes etched into layered dark slabs, with selective green highlights and dotted relation traces. Retro scientific catalog feeling, no text.";
const SAGE_IMG =
  "Abstract expert strata: stacked translucent plates, each containing symbolic knowledge fragments and soft signal drift. Cool charcoal and steel hues with muted green markers, analog archive vibe, no text.";
const PANEL_IMG =
  "Abstract collective intelligence ring: multiple pixel personas around a subtle glowing center, radial connection lines, calm harmonic motion traces, retro-console atmosphere, no text.";

const modelDefs = [
  { key: "persona", img: PERSONA_IMG, accent: "#4ade80" },
  { key: "sage", img: SAGE_IMG, accent: "#93c5fd" },
  { key: "panel", img: PANEL_IMG, accent: "#f59e0b" },
] as const;

export function SubjectiveModelSection() {
  const t = useTranslations("HomePageV4.SubjectiveModel");
  const [activeIdx, setActiveIdx] = useState(0);
  const active = modelDefs[activeIdx];

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
            <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">{t("label")}</span>
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

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 rounded-2xl border border-white/[0.1] bg-black/25 overflow-hidden">
              <div className="relative aspect-[16/9] md:aspect-[16/8.5]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(active.img)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="70vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 bg-black/35 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active.accent }} />
                    <span className="font-IBMPlexMono text-[10px] text-white/70 uppercase tracking-[0.18em]">
                      SAMPLE ENGINE
                    </span>
                  </div>
                  <h3 className="font-EuclidCircularA text-2xl md:text-3xl text-white">{t(`${active.key}.title`)}</h3>
                  <p className="mt-2.5 text-sm md:text-base text-white/65 max-w-2xl leading-relaxed">
                    {t(`${active.key}.description`)}
                  </p>
                  <p className="mt-3 font-IBMPlexMono text-xs" style={{ color: active.accent }}>
                    {t(`${active.key}.stat`)}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-white/[0.1] bg-black/25 p-3.5 md:p-4">
              <div className="space-y-2">
                {modelDefs.map((model, index) => {
                  const selected = index === activeIdx;
                  return (
                    <button
                      key={model.key}
                      type="button"
                      onMouseEnter={() => setActiveIdx(index)}
                      onClick={() => setActiveIdx(index)}
                      className={cn(
                        "w-full text-left rounded-xl border px-3 py-3 transition-all duration-250",
                        selected
                          ? "border-white/35 bg-white/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-EuclidCircularA text-white text-sm">{t(`${model.key}.title`)}</span>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: model.accent }} />
                      </div>
                      <p className="mt-1.5 text-xs text-white/55 leading-relaxed">{t(`${model.key}.stat`)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
