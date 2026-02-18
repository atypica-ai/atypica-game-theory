"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

const SIMULATOR_PROMPT =
  "Abstract retro-futurist social simulation board in deep space. Many tiny HippyGhosts-like pixel personas placed on floating matte modules, connected by thin green dotted paths and subtle vector arrows. Cold steel and charcoal tones, sparse highlights, analog instrument feeling, large negative space. No text.";

const RESEARCHER_PROMPT =
  "Abstract interview observatory: semicircle of translucent panels with tiny HippyGhosts-like pixel persona silhouettes, one brighter facilitator node, faint question glyph-like particles, restrained CRT glow and film grain. Dark minimal background, green accent lines, no text.";

const roleKeys = ["simulator", "researcher"] as const;

export function ThesisSection() {
  const t = useTranslations("HomePageV4.Thesis");
  const [activeRole, setActiveRole] = useState<(typeof roleKeys)[number]>("simulator");

  const accent = useMemo(
    () => (activeRole === "simulator" ? "#4ade80" : "#93c5fd"),
    [activeRole],
  );

  return (
    <section className="relative py-20 md:py-28 bg-[#0a0a0c]">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-4">
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
          <p className="mt-4 text-white/55 text-sm md:text-base max-w-3xl leading-relaxed">{t("description")}</p>

          <div className="mt-8 hidden lg:grid grid-cols-12 gap-4 items-stretch">
            <button
              type="button"
              onMouseEnter={() => setActiveRole("simulator")}
              onClick={() => setActiveRole("simulator")}
              className={cn(
                "col-span-5 text-left rounded-2xl border overflow-hidden transition-all duration-300",
                activeRole === "simulator"
                  ? "border-white/30 shadow-[0_0_30px_rgba(74,222,128,0.08)]"
                  : "border-white/[0.1] hover:border-white/20",
              )}
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-[#4ade80]">{t("simulator.tag")}</span>
                  <h3 className="mt-2 font-EuclidCircularA text-white text-2xl">{t("simulator.title")}</h3>
                  <p className="mt-2 text-white/65 text-sm leading-relaxed">{t("simulator.description")}</p>
                  <p className="mt-3 font-IBMPlexMono text-xs text-[#4ade80]/80">{t("simulator.stat")}</p>
                </div>
              </div>
            </button>

            <div className="col-span-2 flex items-center justify-center">
              <motion.div
                className="h-28 w-28 rounded-full border border-white/15 bg-black/40 flex items-center justify-center"
                animate={{ boxShadow: [`0 0 0 0 ${accent}44`, `0 0 0 24px ${accent}00`] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              >
                <span className="font-IBMPlexMono text-xs text-white/70">SWM CORE</span>
              </motion.div>
            </div>

            <button
              type="button"
              onMouseEnter={() => setActiveRole("researcher")}
              onClick={() => setActiveRole("researcher")}
              className={cn(
                "col-span-5 text-left rounded-2xl border overflow-hidden transition-all duration-300",
                activeRole === "researcher"
                  ? "border-white/30 shadow-[0_0_30px_rgba(147,197,253,0.1)]"
                  : "border-white/[0.1] hover:border-white/20",
              )}
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-[#93c5fd]">{t("researcher.tag")}</span>
                  <h3 className="mt-2 font-EuclidCircularA text-white text-2xl">{t("researcher.title")}</h3>
                  <p className="mt-2 text-white/65 text-sm leading-relaxed">{t("researcher.description")}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(t.raw("researcher.items") as string[]).map((item) => (
                      <span key={item} className="px-2.5 py-1 rounded-full border border-white/[0.14] text-[11px] text-white/70">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 lg:hidden space-y-4">
            {roleKeys.map((key) => {
              const isSimulator = key === "simulator";
              return (
                <div key={key} className="relative rounded-2xl overflow-hidden border border-white/[0.12]">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={`/api/imagegen/dev/${encodeURIComponent(isSimulator ? SIMULATOR_PROMPT : RESEARCHER_PROMPT)}?ratio=landscape`}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className={cn("font-IBMPlexMono text-[10px] uppercase tracking-[0.18em]", isSimulator ? "text-[#4ade80]" : "text-[#93c5fd]")}> 
                      {t(`${key}.tag`)}
                    </span>
                    <h3 className="mt-1.5 font-EuclidCircularA text-white text-xl">{t(`${key}.title`)}</h3>
                    <p className="mt-1.5 text-white/65 text-sm leading-relaxed">{t(`${key}.description`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
