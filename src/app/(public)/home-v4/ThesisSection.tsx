"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const SIMULATOR_PROMPT =
  "Vast dark blue-gray void with dozens of small floating geometric stone platforms at various depths, each carrying a tiny pixel-art persona figure standing or sitting on top. The figures are subtle — small face-as-body pixel silhouettes in muted desaturated tones (pale steel blue, warm gray, dusty mauve, faded sage), just enough to read as individual characters with simple pixel eyes and faint accessories. Thin single-pixel-width green dotted lines and arrows connect platforms, forming a visible social network graph. Some figures face each other in pairs, some cluster in small groups on shared platforms, some stand alone. Most of the image is dark empty space. The stone platforms are cold gray, rough-textured, small against the void. Sparse green particles drift along the connection lines. Cold palette: dark indigo-black, steel gray, cool white, green accents. Film grain. Like observing a quiet AI social simulation from far away. No text.";

const RESEARCHER_PROMPT =
  "Dark space with 7-8 thin translucent floating screens or panels arranged in a loose semicircle, each displaying a pixel-art persona silhouette — face-as-body forms with simple pixel eyes, rendered as soft pixel projections in muted tones (pale gray, dusty blue, warm taupe, faded mauve). The screens are the visual focus — cold, semi-transparent rectangles with faint CRT-like glow at the edges. One screen in front glows faintly green — the facilitator. Tiny pixel speech bubbles and question marks float between the screens. Thin green particle wisps connect them. Vast dark negative space around the semicircle. Cold palette: steel gray, dark indigo background, green accents. Film grain. Like a quiet research interface. No text.";

export function ThesisSection() {
  const t = useTranslations("HomePageV4.Thesis");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Phase 0: Header (0 → 0.22)
  const headerOpacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.15, 0.22],
    [0, 1, 1, 0],
  );
  const headerY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.15, 0.22],
    [50, 0, 0, -40],
  );

  // Phase 1: Simulator (0.18 → 0.55)
  const simImgOpacity = useTransform(
    scrollYProgress,
    [0.18, 0.25, 0.48, 0.55],
    [0, 1, 1, 0],
  );
  const simScale = useTransform(scrollYProgress, [0.18, 0.3], [1.08, 1]);
  const simTextOpacity = useTransform(
    scrollYProgress,
    [0.23, 0.3, 0.48, 0.55],
    [0, 1, 1, 0],
  );
  const simTextY = useTransform(scrollYProgress, [0.23, 0.3], [40, 0]);

  // Phase 2: Researcher (0.50 → 1.0)
  const resImgOpacity = useTransform(
    scrollYProgress,
    [0.5, 0.57, 0.92, 1],
    [0, 1, 1, 1],
  );
  const resScale = useTransform(scrollYProgress, [0.5, 0.62], [1.08, 1]);
  const resTextOpacity = useTransform(
    scrollYProgress,
    [0.55, 0.62],
    [0, 1],
  );
  const resTextY = useTransform(scrollYProgress, [0.55, 0.62], [40, 0]);

  return (
    <>
      {/* Desktop: scroll-driven full-bleed sequence */}
      <div
        ref={containerRef}
        className="hidden lg:block relative"
        style={{ height: "280vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Simulator image */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: simImgOpacity, scale: simScale }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/30 to-[#0a0a0c]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 via-transparent to-transparent" />
          </motion.div>

          {/* Researcher image (on top during crossfade) */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: resImgOpacity, scale: resScale }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/30 to-[#0a0a0c]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 via-transparent to-transparent" />
          </motion.div>

          {/* Phase 0: Header — centered */}
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4"
            style={{ opacity: headerOpacity, y: headerY }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#2d8a4e]" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#2d8a4e]" />
            </div>
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-white text-center",
                "text-3xl md:text-4xl lg:text-5xl",
                "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              )}
            >
              {t("title")}
            </h2>
            <p className="mt-4 text-white/40 text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-center">
              {t("description")}
            </p>
          </motion.div>

          {/* Phase 1: Simulator text — bottom left */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
            style={{ opacity: simTextOpacity, y: simTextY }}
          >
            <span className="font-IBMPlexMono text-[10px] text-[#4ade80] uppercase tracking-[0.2em] mb-3 block">
              {t("simulator.tag")}
            </span>
            <h3 className="font-EuclidCircularA font-medium text-2xl md:text-4xl text-white mb-3 max-w-lg">
              {t("simulator.title")}
            </h3>
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md mb-3">
              {t("simulator.description")}
            </p>
            <p className="font-IBMPlexMono text-xs text-[#4ade80]/60">
              {t("simulator.stat")}
            </p>
          </motion.div>

          {/* Phase 2: Researcher text — bottom left */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
            style={{ opacity: resTextOpacity, y: resTextY }}
          >
            <span className="font-IBMPlexMono text-[10px] text-[#4ade80] uppercase tracking-[0.2em] mb-3 block">
              {t("researcher.tag")}
            </span>
            <h3 className="font-EuclidCircularA font-medium text-2xl md:text-4xl text-white mb-3 max-w-lg">
              {t("researcher.title")}
            </h3>
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md mb-4">
              {t("researcher.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(t.raw("researcher.items") as string[]).map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full text-xs font-EuclidCircularA text-white/50 border border-white/[0.1] bg-white/[0.03]"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <section className="lg:hidden py-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#2d8a4e]" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#2d8a4e]" />
            </div>
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-white",
                "text-2xl md:text-3xl",
                "zh:text-xl zh:md:text-2xl zh:tracking-wide",
              )}
            >
              {t("title")}
            </h2>
            <p className="mt-3 text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
              {t("description")}
            </p>
          </motion.div>

          <div className="space-y-4">
            {/* Simulator */}
            <motion.div
              className="relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/30 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <span className="font-IBMPlexMono text-[10px] text-[#4ade80] uppercase tracking-[0.2em] mb-2">
                  {t("simulator.tag")}
                </span>
                <h3 className="font-EuclidCircularA font-medium text-xl text-white mb-2">
                  {t("simulator.title")}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed mb-2">
                  {t("simulator.description")}
                </p>
                <p className="font-IBMPlexMono text-xs text-[#4ade80]/60">
                  {t("simulator.stat")}
                </p>
              </div>
            </motion.div>

            {/* Researcher */}
            <motion.div
              className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              <div className="p-5">
                <span className="font-IBMPlexMono text-[10px] text-[#4ade80] uppercase tracking-[0.2em] mb-2 block">
                  {t("researcher.tag")}
                </span>
                <h3 className="font-EuclidCircularA font-medium text-xl text-white mb-2">
                  {t("researcher.title")}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  {t("researcher.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(t.raw("researcher.items") as string[]).map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 rounded-full text-xs font-EuclidCircularA text-white/50 border border-white/[0.1] bg-white/[0.03]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
