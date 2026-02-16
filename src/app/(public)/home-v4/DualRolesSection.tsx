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

const SIMULATOR_IMAGE_PROMPT =
  "A cinematic portrait of a person with their reflection showing a completely different persona in a mirror, split identity concept, warm amber lighting on one side and cool blue on the other, dramatic chiaroscuro, editorial photography, shallow depth of field, no text";

const RESEARCHER_IMAGE_PROMPT =
  "Cinematic overhead shot of an intimate conversation between two people at a small table, warm soft lighting from above, the space around them dissolves into abstract flowing data streams, documentary photography style, warm earth tones with subtle blue accents, no text";

export function DualRolesSection() {
  const t = useTranslations("HomePageV4.DualRoles");

  return (
    <section className="py-24 md:py-32 bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div className="max-w-3xl mx-auto text-center mb-16 md:mb-20" {...fadeInUp}>
          <p className="text-sm font-EuclidCircularA text-zinc-500 uppercase tracking-wider mb-4">
            {t("label")}
          </p>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight",
              "text-3xl md:text-4xl lg:text-5xl",
              "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              "text-white",
            )}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-zinc-500 text-sm md:text-base max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Two role cards — full-width stacked on dark bg */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Simulator — horizontal card */}
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-zinc-900 border border-zinc-800",
              "grid grid-cols-1 md:grid-cols-2",
            )}
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_IMAGE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:hidden" />
            </div>

            <div className="relative p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-start justify-between mb-6">
                <span className="font-IBMPlexMono text-7xl font-light text-zinc-800/60">01</span>
              </div>

              <h3
                className={cn(
                  "font-EuclidCircularA font-medium text-2xl md:text-3xl mb-2",
                  "text-white",
                )}
              >
                {t("simulator.title")}
              </h3>
              <p className="text-sm text-zinc-500 font-EuclidCircularA mb-4">
                {t("simulator.titleEn")}
              </p>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                {t("simulator.description")}
              </p>

              <div className="pt-6 border-t border-zinc-800">
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3 font-EuclidCircularA">
                  {t("simulator.capabilityLabel")}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t("simulator.capability")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Researcher — horizontal card, image on right */}
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-zinc-900 border border-zinc-800",
              "grid grid-cols-1 md:grid-cols-2",
            )}
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative p-8 md:p-12 flex flex-col justify-center order-2 md:order-1">
              <div className="flex items-start justify-between mb-6">
                <span className="font-IBMPlexMono text-7xl font-light text-zinc-800/60">02</span>
              </div>

              <h3
                className={cn(
                  "font-EuclidCircularA font-medium text-2xl md:text-3xl mb-2",
                  "text-white",
                )}
              >
                {t("researcher.title")}
              </h3>
              <p className="text-sm text-zinc-500 font-EuclidCircularA mb-4">
                {t("researcher.titleEn")}
              </p>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                {t("researcher.description")}
              </p>

              <div className="pt-6 border-t border-zinc-800">
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3 font-EuclidCircularA">
                  {t("researcher.methodsLabel")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["method1", "method2", "method3", "method4", "method5"] as const).map((key) => (
                    <span
                      key={key}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400 font-EuclidCircularA"
                    >
                      {t(`researcher.${key}`)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden order-1 md:order-2">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_IMAGE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-zinc-900 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:hidden" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
