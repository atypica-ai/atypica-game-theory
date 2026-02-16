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

const WORKER_IMAGE_PROMPT =
  "Minimalist abstract composition of geometric gears cogs and circuit patterns on a cool grey background, mechanical precision, clean lines, monochrome steel blue tones, no text, modern graphic design style, flat lighting";

const UNDERSTANDING_IMAGE_PROMPT =
  "Cinematic close-up portrait of a human eye reflecting a warm golden light, the iris contains subtle neural network patterns, dramatic chiaroscuro lighting, warm amber and deep shadow tones, photorealistic, intimate and contemplative mood, no text";

export function AgentComparisonSection() {
  const t = useTranslations("HomePageV4.AgentComparison");

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div className="max-w-3xl mx-auto text-center mb-16 md:mb-20" {...fadeInUp}>
          <p className="text-sm font-EuclidCircularA text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            {t("label")}
          </p>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight",
              "text-3xl md:text-4xl lg:text-5xl",
              "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              "text-zinc-950 dark:text-white",
            )}
          >
            {t("title")}
          </h2>
        </motion.div>

        {/* Two columns with images */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Worker Agent */}
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800",
            )}
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Card image */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(WORKER_IMAGE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-900/50 via-transparent to-transparent" />
            </div>

            <div className="p-8 md:p-10">
              <h3 className="font-EuclidCircularA font-medium text-2xl text-zinc-950 dark:text-white mb-3">
                {t("worker.title")}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                {t("worker.description")}
              </p>
              <ul className="space-y-2.5">
                {(["task1", "task2", "task3"] as const).map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2.5 text-sm text-zinc-400 dark:text-zinc-500"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    {t(`worker.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Understanding Agent */}
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-zinc-950 dark:bg-white border border-zinc-800 dark:border-zinc-200",
            )}
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Card image */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(UNDERSTANDING_IMAGE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 dark:from-white via-transparent to-transparent" />
            </div>

            <div className="p-8 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-EuclidCircularA font-medium text-2xl text-white dark:text-zinc-950">
                  {t("understanding.title")}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/10 dark:bg-zinc-950/10 text-xs text-white/60 dark:text-zinc-500 font-EuclidCircularA">
                  {t("understanding.badge")}
                </span>
              </div>
              <p className="text-zinc-400 dark:text-zinc-500 text-sm leading-relaxed mb-6">
                {t("understanding.description")}
              </p>
              <ul className="space-y-2.5">
                {(["task1", "task2", "task3"] as const).map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2.5 text-sm text-zinc-300 dark:text-zinc-600"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-500" />
                    {t(`understanding.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Bottom tagline */}
        <motion.p
          className={cn(
            "max-w-2xl mx-auto text-center mt-12 md:mt-16",
            "text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed",
            "font-InstrumentSerif italic text-lg md:text-xl",
          )}
          {...fadeInUp}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {t("tagline")}
        </motion.p>
      </div>
    </section>
  );
}
