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

const METHODS_HERO_PROMPT =
  "Abstract aerial view of interconnected rooms in a minimalist architectural model, each room contains a different scene of human interaction, warm spotlights illuminate each room, cool dark corridors connect them, architectural photography, tilt shift effect, no text, clean modern aesthetic";

const methods = [
  { key: "interview", accent: "bg-blue-500", number: "01" },
  { key: "focusGroup", accent: "bg-violet-500", number: "02" },
  { key: "panel", accent: "bg-amber-500", number: "03" },
  { key: "persona", accent: "bg-emerald-500", number: "04" },
  { key: "simulation", accent: "bg-rose-500", number: "05" },
] as const;

export function UnderstandingMethodsSection() {
  const t = useTranslations("HomePageV4.Methods");

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Wide hero image with overlay text */}
        <motion.div
          className="relative max-w-6xl mx-auto rounded-2xl overflow-hidden mb-16 md:mb-20"
          {...fadeInUp}
        >
          <div className="relative aspect-[21/9] md:aspect-[3/1]">
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(METHODS_HERO_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/20" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <p className="text-sm font-EuclidCircularA text-white/50 uppercase tracking-wider mb-3">
              {t("label")}
            </p>
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-white",
                "text-3xl md:text-4xl lg:text-5xl",
                "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              )}
            >
              {t("title")}
            </h2>
            <p className="mt-3 text-white/50 text-sm md:text-base max-w-xl">
              {t("subtitle")}
            </p>
          </div>
        </motion.div>

        {/* Methods grid — clean, numbered list */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden">
            {methods.map((method, i) => (
              <motion.div
                key={method.key}
                className={cn(
                  "bg-white dark:bg-zinc-950 p-6 md:p-7",
                  "transition-all duration-300",
                  "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                  // Let the 5th item span full width on sm
                  i === 4 && "sm:col-span-2 lg:col-span-1",
                )}
                {...fadeInUp}
                transition={{ duration: 0.5, delay: 0.08 * i }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-2 h-2 rounded-full", method.accent)} />
                  <span className="font-IBMPlexMono text-xs text-zinc-400 dark:text-zinc-600">
                    {method.number}
                  </span>
                </div>

                <h3 className="font-EuclidCircularA font-medium text-sm md:text-base text-zinc-950 dark:text-white mb-3">
                  {t(`${method.key}.title`)}
                </h3>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t(`${method.key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
