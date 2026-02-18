"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  // 3 cards: scroll moves horizontally through 2 cards (200vw).
  // Must use vw units — percentage would be relative to the flex container's
  // computed width (100vw), not its content width (300vw).
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", "-200vw"]);

  // Progress dots
  const dot1Opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4],
    [1, 1, 0.3],
  );
  const dot2Opacity = useTransform(
    scrollYProgress,
    [0.2, 0.4, 0.6],
    [0.3, 1, 0.3],
  );
  const dot3Opacity = useTransform(
    scrollYProgress,
    [0.5, 0.7, 1],
    [0.3, 1, 1],
  );

  return (
    <>
      {/* Header */}
      <section className="pt-24 md:pt-32 pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
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
                  "font-EuclidCircularA font-medium tracking-tight text-white",
                  "text-3xl md:text-4xl lg:text-5xl",
                  "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
                )}
              >
                {t("title")}
              </h2>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Horizontal scroll cinema — Desktop */}
      <div
        ref={scrollRef}
        className="relative hidden lg:block"
        style={{ height: "400vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <motion.div className="flex h-full" style={{ x }}>
            {featuredCases.map(({ key, img }, i) => (
              <div
                key={key}
                className="w-screen h-full shrink-0 flex items-center px-8"
              >
                <div className="w-full h-[80vh] relative rounded-2xl overflow-hidden group">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <span className="font-IBMPlexMono text-xs text-[#4ade80] mb-3 block">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h4 className="font-EuclidCircularA font-medium text-2xl md:text-3xl text-white mb-3 max-w-lg">
                      {t(`cases.${key}.title`)}
                    </h4>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md">
                      {t(`cases.${key}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Progress dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
            {[dot1Opacity, dot2Opacity, dot3Opacity].map((opacity, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-[#4ade80]"
                style={{ opacity }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — stacked featured cards */}
      <section className="lg:hidden pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 gap-4">
            {featuredCases.map(({ key, img }, i) => (
              <motion.div
                key={key}
                className="group rounded-2xl overflow-hidden"
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
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/30 to-transparent" />
                  <span className="absolute top-4 left-4 font-IBMPlexMono text-xs text-[#4ade80] bg-[#0a0a0c]/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="p-5 bg-white/[0.03] border border-white/[0.08] border-t-0 rounded-b-2xl">
                  <h4 className="font-EuclidCircularA font-medium text-base text-white mb-2">
                    {t(`cases.${key}.title`)}
                  </h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {t(`cases.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compact 6 — staggered cascade */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compactCases.map((key, i) => (
                <motion.div
                  key={key}
                  className={cn(
                    "group p-5 md:p-6 rounded-2xl",
                    "bg-white/[0.03] border border-white/[0.08]",
                    "transition-all duration-300",
                    "hover:bg-white/[0.06] hover:border-white/[0.12]",
                  )}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: 0.05 * i }}
                >
                  <span className="font-IBMPlexMono text-xs text-[#4ade80] mb-3 block">
                    {String(i + 4).padStart(2, "0")}
                  </span>
                  <h4 className="font-EuclidCircularA font-medium text-sm text-white mb-1.5">
                    {t(`cases.${key}.title`)}
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {t(`cases.${key}.description`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
