"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURED_IMG_1 =
  "Dark space with a stream of tiny pixel-art persona figures drifting across the scene from left to right, carried along gentle green particle currents like leaves in a river. The figures are face-as-body silhouettes in muted tones (pale gray, warm off-white, dusty blue), some more formed, some dissolving into pixel fragments that trail behind them. The green particle streams are thin and sparse. Most of the image is dark void. The figures are small against the vastness. Cold palette: dark charcoal, steel gray, green particle accents. Film grain. Like watching data personas migrate through a system. No text.";

const FEATURED_IMG_2 =
  "Parallel streams of sparse luminous particles flowing in gentle curves through vast dark space — each stream a different cold tone (silver, pale blue, sage green). Where streams converge, brief bright points of light appear. Vast dark emptiness between and around the streams. The particles are tiny and sparse — most of the image is dark void. Cold palette with green accent where streams meet. Cosmic, minimal, rhythmic. Film grain. No people, no text.";

const FEATURED_IMG_3 =
  "A few translucent geometric polyhedra of different sizes floating at various depths in vast dark space. Each contains a different subtle internal element — one has swirling particles, one a faint wireframe mesh, one a green glow. They cast no shadows. Faint dotted lines connect some of them. The polyhedra are small against enormous dark blue-gray void. Cold palette: steel gray edges, cool white reflections, green internal accents. Film grain. No people, no text.";

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
