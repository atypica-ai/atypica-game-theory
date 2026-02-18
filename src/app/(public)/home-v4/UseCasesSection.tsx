"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

const CASE_IMG_A =
  "Abstract signal cartography: drifting pixel personas, directional traces, and market-flow vectors over dark matte terrain. Retro instrument graphics with subtle green calibration accents. No text.";
const CASE_IMG_B =
  "Abstract innovation lab panorama: geometric prototypes, sparse waveform ribbons, and controlled glow intersections. Charcoal, steel, and muted green palette, analog sci-fi restraint. No text.";
const CASE_IMG_C =
  "Abstract decision observatory: layered panels, soft pulse rings, and connected insight nodes around tiny HippyGhosts-like silhouettes. High negative space, film grain, no text.";

const caseKeys = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"] as const;

export function UseCasesSection() {
  const t = useTranslations("HomePageV4.UseCases");
  const [activeCase, setActiveCase] = useState<(typeof caseKeys)[number]>("c1");

  const activeIndex = caseKeys.indexOf(activeCase);
  const activeImage = useMemo(() => {
    if (activeIndex < 3) return CASE_IMG_A;
    if (activeIndex < 6) return CASE_IMG_B;
    return CASE_IMG_C;
  }, [activeIndex]);

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

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.1] bg-black/25 p-3.5 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {caseKeys.map((key, index) => {
                  const selected = key === activeCase;
                  return (
                    <button
                      key={key}
                      type="button"
                      onMouseEnter={() => setActiveCase(key)}
                      onClick={() => setActiveCase(key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all duration-250",
                        selected
                          ? "border-white/35 bg-white/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      <span className="font-IBMPlexMono text-[10px] text-white/45">{String(index + 1).padStart(2, "0")}</span>
                      <p className="mt-1.5 text-sm text-white leading-snug">{t(`cases.${key}.title`)}</p>
                      <p className="mt-1.5 text-xs text-white/55 leading-relaxed line-clamp-2">{t(`cases.${key}.description`)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-white/[0.1] overflow-hidden bg-black/25">
              <div className="relative aspect-[16/11] md:aspect-[4/3]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(activeImage)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1 mb-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                    <span className="font-IBMPlexMono text-[10px] text-white/70 uppercase tracking-[0.18em]">Active Scenario</span>
                  </div>
                  <h3 className="font-EuclidCircularA text-xl md:text-2xl text-white">{t(`cases.${activeCase}.title`)}</h3>
                  <p className="mt-2 text-sm text-white/65 leading-relaxed">{t(`cases.${activeCase}.description`)}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
