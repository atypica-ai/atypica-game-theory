"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const PERSONA_IMG =
  "A vast bird's-eye view of a dark floating stone surface extending into the distance, with hundreds of tiny pixel-art persona figures imprinted or etched onto its surface — like ancient pixel pictographs on a monolith. Each figure is a face-as-body silhouette with simple pixel eyes, rendered in muted tones slightly lighter than the stone (pale gray, warm off-white, faded blue). The figures are small and subtle, part of the surface texture. Some figures glow faintly green. Thin green dotted lines connect certain figures across the stone. The stone surface cracks and fragments at the edges, dissolving into dark void. Enormous dark negative space around. Cold palette: dark charcoal stone, steel gray, green accents. Film grain. Like discovering an ancient database carved into alien rock. No text.";

const SAGE_IMG =
  "Stacked horizontal slabs of different materials floating parallel in dark space, separated by gaps — one slab is rough concrete, one is translucent crystal, one is smooth dark stone, one is fine granular sand. Sparse green particles migrate between the slabs through thin vertical channels. Each slab catches cold light differently. The stack is small against vast dark blue-gray emptiness. Cold palette with green particle accents. Geological, deep, accumulated. Film grain. No people, no text.";

const PANEL_IMG =
  "Top-down view of 8 faint pixel-art persona figures arranged in a circle in dark space, projected as holographic pixel forms — semi-transparent, floating just above the dark surface, each a face-as-body silhouette with simple pixel eyes in muted cool tones. The holograms flicker subtly with faint scan lines. At the center, a soft green glow with slowly swirling green particles — collective intelligence forming from the discussion. Tiny pixel thought fragments drift above some figures. Vast dark negative space around the circle. Cold palette: translucent blue-gray holograms, dark charcoal background, green glow at center. Film grain. Like observing a council of AI minds. No text.";

const cards = [
  { key: "persona", img: PERSONA_IMG },
  { key: "sage", img: SAGE_IMG },
  { key: "panel", img: PANEL_IMG },
] as const;

export function SubjectiveModelSection() {
  const t = useTranslations("HomePageV4.SubjectiveModel");
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Track active card for counter
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (v < 0.15) {
        setActiveIdx(0);
        return;
      }
      const normalized = (v - 0.15) / 0.85;
      const idx = Math.min(Math.floor(normalized * 3), 2);
      setActiveIdx((prev) => (prev !== idx ? idx : prev));
    });
  }, [scrollYProgress]);

  // Phase 0: Header (0 → 0.18)
  const headerOpacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.12, 0.18],
    [0, 1, 1, 0],
  );
  const headerY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.12, 0.18],
    [50, 0, 0, -30],
  );

  // Card phases: C0: 0.15-0.43, C1: 0.43-0.72, C2: 0.72-1.0
  const c0Opacity = useTransform(
    scrollYProgress,
    [0.12, 0.18, 0.38, 0.43],
    [0, 1, 1, 0],
  );
  const c0Scale = useTransform(scrollYProgress, [0.12, 0.22], [1.08, 1]);
  const c0TextOpacity = useTransform(
    scrollYProgress,
    [0.16, 0.23, 0.38, 0.43],
    [0, 1, 1, 0],
  );
  const c0TextY = useTransform(scrollYProgress, [0.16, 0.23], [40, 0]);

  const c1Opacity = useTransform(
    scrollYProgress,
    [0.43, 0.48, 0.67, 0.72],
    [0, 1, 1, 0],
  );
  const c1Scale = useTransform(scrollYProgress, [0.43, 0.53], [1.08, 1]);
  const c1TextOpacity = useTransform(
    scrollYProgress,
    [0.46, 0.53, 0.67, 0.72],
    [0, 1, 1, 0],
  );
  const c1TextY = useTransform(scrollYProgress, [0.46, 0.53], [40, 0]);

  const c2Opacity = useTransform(
    scrollYProgress,
    [0.72, 0.77, 0.93, 1],
    [0, 1, 1, 1],
  );
  const c2Scale = useTransform(scrollYProgress, [0.72, 0.82], [1.08, 1]);
  const c2TextOpacity = useTransform(
    scrollYProgress,
    [0.75, 0.82],
    [0, 1],
  );
  const c2TextY = useTransform(scrollYProgress, [0.75, 0.82], [40, 0]);

  const imgOpacities = [c0Opacity, c1Opacity, c2Opacity];
  const imgScales = [c0Scale, c1Scale, c2Scale];
  const textOpacities = [c0TextOpacity, c1TextOpacity, c2TextOpacity];
  const textYs = [c0TextY, c1TextY, c2TextY];

  return (
    <>
      {/* Desktop: scroll-driven triptych */}
      <div
        ref={containerRef}
        className="hidden lg:block relative"
        style={{ height: "350vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Card image layers */}
          {cards.map((card, i) => (
            <motion.div
              key={card.key}
              className="absolute inset-0"
              style={{ opacity: imgOpacities[i], scale: imgScales[i] }}
            >
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(card.img)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/30 to-[#0a0a0c]/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/60 via-transparent to-transparent" />
            </motion.div>
          ))}

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
          </motion.div>

          {/* Card text overlays */}
          {cards.map((card, i) => (
            <motion.div
              key={`text-${card.key}`}
              className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
              style={{ opacity: textOpacities[i], y: textYs[i] }}
            >
              <h3 className="font-EuclidCircularA font-medium text-2xl md:text-4xl text-white mb-3 max-w-lg">
                {t(`${card.key}.title`)}
              </h3>
              <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md mb-3">
                {t(`${card.key}.description`)}
              </p>
              <span className="font-IBMPlexMono text-xs text-[#4ade80]">
                {t(`${card.key}.stat`)}
              </span>
            </motion.div>
          ))}

          {/* Counter — bottom right */}
          <div className="absolute bottom-8 right-8 md:bottom-16 md:right-16 z-20">
            <span className="font-IBMPlexMono text-sm">
              <span className="text-[#4ade80]">
                {String(activeIdx + 1).padStart(2, "0")}
              </span>
              <span className="mx-2 text-white/20">/</span>
              <span className="text-white/30">
                {String(cards.length).padStart(2, "0")}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: stacked */}
      <section className="lg:hidden py-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#2d8a4e]" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
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
          </motion.div>

          <div className="space-y-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.key}
                className="relative rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(card.img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/30 to-transparent" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <h3 className="font-EuclidCircularA font-medium text-xl text-white mb-2">
                    {t(`${card.key}.title`)}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-2">
                    {t(`${card.key}.description`)}
                  </p>
                  <span className="font-IBMPlexMono text-xs text-[#4ade80]">
                    {t(`${card.key}.stat`)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
