"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

const STATS_BG_PROMPT =
  "Abstract macro photography of neural network connections rendered as golden threads weaving through dark space, bokeh lights in background, deep black with warm gold and copper accents, scientific visualization aesthetic, no text, cinematic depth of field";

const stats = [
  { key: "personas", value: "300K+" },
  { key: "interviews", value: "1M+" },
  { key: "speed", value: "<30min" },
] as const;

export function StatsSection() {
  const t = useTranslations("HomePageV4.Stats");

  return (
    <section className="relative py-24 md:py-32 bg-zinc-950 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(STATS_BG_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-zinc-950/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div className="max-w-3xl mx-auto text-center mb-16" {...fadeInUp}>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight text-white",
              "text-3xl md:text-4xl lg:text-5xl",
              "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
            )}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-zinc-500 text-sm md:text-base max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              className="text-center"
              {...fadeInUp}
              transition={{ duration: 0.6, delay: 0.1 * i }}
            >
              <div className="font-IBMPlexMono text-5xl md:text-7xl font-light text-white tracking-tight">
                {stat.value}
              </div>
              <div className="mt-3 text-sm text-zinc-500 font-EuclidCircularA">
                {t(`${stat.key}.label`)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Subjective world model callout */}
        <motion.div
          className={cn(
            "max-w-3xl mx-auto mt-16 md:mt-20 p-8 md:p-10 rounded-2xl text-center",
            "bg-white/5 border border-white/10 backdrop-blur-sm",
          )}
          {...fadeInUp}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p
            className={cn(
              "font-EuclidCircularA font-medium text-lg md:text-xl",
              "text-white",
              "zh:text-base zh:md:text-lg",
            )}
          >
            {t("modelTitle")}
          </p>
          <p className="mt-3 text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            {t("modelDescription")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(["values", "risk", "emotion", "decision", "social"] as const).map((key) => (
              <span
                key={key}
                className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-zinc-300 font-EuclidCircularA"
              >
                {t(`dimensions.${key}`)}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
