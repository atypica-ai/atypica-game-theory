"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURED_IMG_1 =
  "A scene of 40-50 diverse tiny pixel-art figures walking and interacting across an open minimal space. As they move, abstract data patterns materialize around them — translucent geometric shapes, floating dot-clusters, and faint particle trails emerge like visible auras. These individual data-auras drift upward and converge into larger abstract formations above the crowd — flowing, organic, beautiful. Figures are warm-colored and grounded at bottom; abstract data floats above in cooler tones (sage, teal, silver). Background: clean warm cream. Style: pixel art figures below, generative abstract art above — insights emerging from human behavior. No text.";

const FEATURED_IMG_2 =
  "An abstract composition of flowing particle streams — hundreds of tiny luminous dots traveling in parallel undulating curves across warm dark space, like stellar migration patterns. The streams weave in organic wave patterns, converging where trends align and diverging where they split. Different streams carry different colors — amber, sage green, coral, teal. Where streams intersect, brief interference patterns create bursts of light. Background: deep warm charcoal with fine analog noise. Style: abstract data-flow visualization at cosmic scale. Minimal, hypnotic, rhythmic. No recognizable objects, no people, no text.";

const FEATURED_IMG_3 =
  "An abstract array of translucent geometric polyhedra floating at various depths in warm cream-amber space. Each polyhedron contains a different internal world — one holds swirling particles, another a miniature wireframe mesh, another flowing color gradients, another pulsing rhythmic light. They hover at different scales and distances, viewing the same reality through different lenses. Faint dotted measurement lines connect certain polyhedra. Color palette: warm cream background, amber and sage-green internal glows, silver-white edges. Retro scientific illustration texture — slight grain, analog warmth. Style: abstract analytical art. No recognizable objects, no people, no text.";

const featuredCases = [
  { key: "c1", img: FEATURED_IMG_1 },
  { key: "c2", img: FEATURED_IMG_2 },
  { key: "c3", img: FEATURED_IMG_3 },
] as const;

const compactCases = ["c4", "c5", "c6", "c7", "c8", "c9"] as const;

export function UseCasesSection() {
  const t = useTranslations("HomePageV4.UseCases");

  return (
    <section className="py-24 md:py-32 border-t border-zinc-200">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-12 md:mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#2d8a4e]" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
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
          </motion.div>

          {/* Featured 3 — larger cards with images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {featuredCases.map(({ key, img }, i) => (
              <motion.div
                key={key}
                className={cn(
                  "group rounded-2xl overflow-hidden",
                  "bg-white border border-zinc-200 shadow-sm",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:border-zinc-300",
                )}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.08 * i }}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute top-4 left-4 font-IBMPlexMono text-xs text-white bg-zinc-900/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="p-5 md:p-6">
                  <h4 className="font-EuclidCircularA font-medium text-base text-zinc-900 mb-2">
                    {t(`cases.${key}.title`)}
                  </h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {t(`cases.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compact 6 — text-only numbered list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {compactCases.map((key, i) => (
              <motion.div
                key={key}
                className={cn(
                  "group p-5 md:p-6 rounded-2xl",
                  "bg-white border border-zinc-200 shadow-sm",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:border-zinc-300",
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
              >
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e] mb-3 block">
                  {String(i + 4).padStart(2, "0")}
                </span>
                <h4 className="font-EuclidCircularA font-medium text-sm text-zinc-900 mb-1.5">
                  {t(`cases.${key}.title`)}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t(`cases.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
