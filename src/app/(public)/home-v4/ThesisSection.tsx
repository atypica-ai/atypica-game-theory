"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const SIMULATOR_PROMPT =
  "Hundreds of tiny pixel-art figures scattered across a vast minimal cream-white space, viewed from a gentle aerial perspective. Each figure is only 6-10 pixels tall but uniquely colored and styled — different silhouettes, postures, and hues of coral, amber, teal, indigo, sage, and pink. Some cluster in small conversation groups, others walk alone, some stand still as if thinking. Faint translucent data-threads connect certain figures across the space, forming an organic network pattern. The figures cast soft colored shadows. The ground is a clean warm gradient with barely visible grid lines. At the edges, figures dissolve into scattered pixels and particles, suggesting an expanding simulation. Style: crisp isometric pixel art, clean airy modern composition. Warm and inviting. No text, no UI elements.";

const RESEARCHER_PROMPT =
  "A small cluster of 7-8 colorful pixel-art figures sitting in a loose semicircle, as if in a focus group discussion. Each figure is distinctly styled — different sizes, colors (warm coral, sage green, golden amber, deep indigo), and poses: one leaning forward, one gesturing while speaking, one with hand on chin thinking. Between them, abstract shapes float gently upward — soft geometric fragments, tiny particle bursts, translucent thought-bubbles made of scattered dots. A slightly larger figure on one side listens carefully, facilitating. Background: warm cream-to-peach gradient, spacious and minimal. Style: charming pixel art characters (8-16px scale) against a soft painterly background. Contrast between crisp pixel figures and organic abstract particles. Warm, intellectual, human. No text.";

export function ThesisSection() {
  const t = useTranslations("HomePageV4.Thesis");

  return (
    <section className="py-24 md:py-32 border-t border-zinc-200">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header — centered */}
          <motion.div
            className="text-center mb-16 md:mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#2d8a4e]" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#2d8a4e]" />
            </div>
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-zinc-900",
                "text-3xl md:text-4xl lg:text-5xl",
                "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              )}
            >
              {t("title")}
            </h2>
            <p className="mt-4 text-zinc-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              {t("description")}
            </p>
          </motion.div>

          {/* Two roles — asymmetric layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Simulator — larger, image-dominant */}
            <motion.div
              className="lg:col-span-7 group relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="relative aspect-[4/3] md:aspect-[16/10] lg:aspect-auto lg:h-full">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/40 to-transparent" />

                {/* Overlaid text content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                  <span className="font-IBMPlexMono text-[10px] text-[#4ade80] uppercase tracking-[0.2em] mb-3">
                    {t("simulator.tag")}
                  </span>
                  <h3 className="font-EuclidCircularA font-medium text-2xl md:text-3xl text-white mb-3">
                    {t("simulator.title")}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed max-w-md mb-4">
                    {t("simulator.description")}
                  </p>
                  <p className="font-IBMPlexMono text-xs text-[#4ade80]/60">
                    {t("simulator.stat")}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Researcher — card-style with image */}
            <motion.div
              className={cn(
                "lg:col-span-5 group rounded-2xl overflow-hidden",
                "bg-white border border-zinc-200 shadow-sm",
                "transition-all duration-300",
                "hover:shadow-lg hover:border-zinc-300",
              )}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </div>
              <div className="p-6 md:p-8">
                <span className="font-IBMPlexMono text-[10px] text-[#2d8a4e] uppercase tracking-[0.2em] mb-3 block">
                  {t("researcher.tag")}
                </span>
                <h3 className="font-EuclidCircularA font-medium text-xl md:text-2xl text-zinc-900 mb-3">
                  {t("researcher.title")}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-5">
                  {t("researcher.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(t.raw("researcher.items") as string[]).map((item) => (
                    <span
                      key={item}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-EuclidCircularA",
                        "text-zinc-500 border border-zinc-200 bg-zinc-50",
                        "transition-all duration-200",
                        "hover:text-[#2d8a4e] hover:border-[#2d8a4e]/30",
                      )}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
