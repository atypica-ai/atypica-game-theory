"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const INTERACTION_HERO_PROMPT =
  "Wide panoramic retro-futurist command theater in deep space. Dark matte consoles and analog instrument panels float in layered depth. Between them, tiny HippyGhosts-like pixel personas stand as operators, each with a distinct silhouette and subtle accessories. Thin green phosphor signal lines connect consoles like a living intelligence network. Faint CRT scanlines, brushed metal texture, restrained glow, heavy negative space. Palette: charcoal, steel gray, oxidized green, muted off-white. Abstract but legible. Strong AI atmosphere without cyberpunk neon. Film grain. No text.";

const METHOD_ACCENTS = ["#4ade80", "#93c5fd", "#f59e0b", "#f472b6", "#22d3ee"];
const MODALITY_ACCENTS = ["#4ade80", "#f59e0b", "#93c5fd", "#a78bfa", "#f472b6"];

export function InteractionModesSection() {
  const t = useTranslations("HomePageV4.InteractionModes");
  const locale = useLocale();

  const methods = t.raw("methods") as string[];
  const modalities = t.raw("modalities") as string[];

  const [activeMethod, setActiveMethod] = useState(0);
  const [activeModality, setActiveModality] = useState(0);

  const activeAccent = useMemo(() => {
    const m = METHOD_ACCENTS[activeMethod % METHOD_ACCENTS.length];
    const n = MODALITY_ACCENTS[activeModality % MODALITY_ACCENTS.length];
    return activeMethod >= activeModality ? m : n;
  }, [activeMethod, activeModality]);

  const pulseWords =
    locale === "zh-CN"
      ? ["信号采样", "语义对齐", "行为建模", "洞察输出"]
      : ["Signal Sampling", "Semantic Alignment", "Behavior Modeling", "Insight Output"];

  return (
    <section className="relative bg-[#0a0a0c] py-20 md:py-28">
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(INTERACTION_HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/70 via-[#0a0a0c]/85 to-[#0a0a0c]" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-px bg-[#4ade80]" />
            <span className="font-IBMPlexMono text-xs text-[#4ade80] uppercase tracking-[0.2em]">
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
          <p className="mt-3 text-white/55 text-sm md:text-base max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
            <div className="lg:col-span-3 rounded-2xl border border-white/[0.1] bg-black/25 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-EuclidCircularA text-sm text-white/90">{t("methodsTitle")}</h3>
                <span className="text-[10px] font-IBMPlexMono text-white/45 uppercase">{t("methodsTag")}</span>
              </div>
              <div className="space-y-2">
                {methods.map((method, i) => {
                  const active = i === activeMethod;
                  return (
                    <button
                      key={method}
                      type="button"
                      onMouseEnter={() => setActiveMethod(i)}
                      onClick={() => setActiveMethod(i)}
                      className={cn(
                        "w-full text-left rounded-xl px-3 py-2.5 border transition-all duration-250",
                        active
                          ? "bg-white/10 border-white/35"
                          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="font-IBMPlexMono text-[10px] text-white/40 mr-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={cn("text-sm", active ? "text-white" : "text-white/65")}>
                        {method}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-white/[0.1] bg-black/35 backdrop-blur-sm overflow-hidden">
              <div className="relative min-h-[280px] md:min-h-[340px] p-5 md:p-6">
                <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:24px_24px]" />

                <motion.div
                  className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                  style={{ borderColor: `${activeAccent}66` }}
                />

                <motion.div
                  className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                  style={{ borderColor: `${activeAccent}77` }}
                />

                <motion.div
                  className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  animate={{ boxShadow: [`0 0 0 0 ${activeAccent}55`, `0 0 0 16px ${activeAccent}00`] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                  style={{ backgroundColor: activeAccent }}
                />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  <div className="rounded-xl border border-white/[0.1] bg-black/25 p-4 flex flex-col justify-between">
                    <div>
                      <p className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-white/45">Method Channel</p>
                      <p className="mt-3 font-EuclidCircularA text-white text-lg">{methods[activeMethod]}</p>
                    </div>
                    <div className="mt-6 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        key={`m-${activeMethod}`}
                        initial={{ width: "12%" }}
                        animate={{ width: `${42 + activeMethod * 10}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        style={{ backgroundColor: METHOD_ACCENTS[activeMethod % METHOD_ACCENTS.length] }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.1] bg-black/25 p-4 flex flex-col justify-between">
                    <div>
                      <p className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-white/45">Input Modality</p>
                      <p className="mt-3 font-EuclidCircularA text-white text-lg">{modalities[activeModality]}</p>
                    </div>
                    <div className="mt-6 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        key={`n-${activeModality}`}
                        initial={{ width: "10%" }}
                        animate={{ width: `${35 + activeModality * 11}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        style={{ backgroundColor: MODALITY_ACCENTS[activeModality % MODALITY_ACCENTS.length] }}
                      />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {pulseWords.map((word, idx) => (
                    <motion.div
                      key={word}
                      className="rounded-lg border border-white/[0.12] bg-black/30 px-2.5 py-2 text-center"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ delay: idx * 0.18, duration: 1.8, repeat: Infinity }}
                    >
                      <span className="font-IBMPlexMono text-[10px] text-white/70 uppercase tracking-wider">{word}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-white/[0.1] bg-black/25 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-EuclidCircularA text-sm text-white/90">{t("modalitiesTitle")}</h3>
                <span className="text-[10px] font-IBMPlexMono text-white/45 uppercase">{t("modalitiesTag")}</span>
              </div>
              <div className="space-y-2">
                {modalities.map((modality, i) => {
                  const active = i === activeModality;
                  return (
                    <button
                      key={modality}
                      type="button"
                      onMouseEnter={() => setActiveModality(i)}
                      onClick={() => setActiveModality(i)}
                      className={cn(
                        "w-full text-left rounded-xl px-3 py-2.5 border transition-all duration-250",
                        active
                          ? "bg-white/10 border-white/35"
                          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="font-IBMPlexMono text-[10px] text-white/40 mr-2">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={cn("text-sm", active ? "text-white" : "text-white/65")}>
                        {modality}
                      </span>
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
