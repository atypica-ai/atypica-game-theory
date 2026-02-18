"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const PROACTIVE_IMG =
  "A single thin ring of sparse green particles expanding outward in vast dark void — like a ripple frozen in still water. Inside the ring, emptiness. Outside, a few scattered particle fragments drifting. The ring is barely there, just a faint suggestion of constant quiet observation. Extremely minimal composition — almost entirely dark blue-gray negative space. Cold palette with green as the only color. Film grain. No people, no text.";

const AUTO_IMG =
  "Three small abstract forms floating in a line across vast dark space — left: a rough fractured stone-like shard; center: a partially refined translucent geometric solid; right: a smooth perfect sphere with faint green internal glow. Between them, thin sparse particle streams suggest transformation from raw to refined. The three forms are tiny against enormous dark blue-gray void. Cold palette: steel gray, cool white, green accent on the sphere. Film grain. No people, no text.";

const HUMAN_IMG =
  "Dark space with a loose crowd of pixel-art persona figures materializing from particle clouds — some nearly fully formed, some half-dissolved into scattered pixels, some just a faint suggestion of eyes in a cloud of particles. The figures are face-as-body silhouettes in muted desaturated tones (pale steel blue, warm gray, dusty mauve). At the center, one figure is distinctly more solid and glows with a subtle green aura — the human researcher, clearly present among dissolving AI personas. Thin green particle threads radiate from the central figure outward. Most of the image is dark void with drifting pixel fragments. Cold palette: dark indigo-black, steel gray, cool white, green accents. Film grain. Like watching personas condense and evaporate around a human anchor. No text.";

const MODEL_IMG =
  "Nested translucent geometric wireframe shells floating in deep dark space — an icosahedron inside a dodecahedron inside a cube, each barely visible. At the very center, a small dense cluster of green particles pulses slowly. A few sparse particles orbit the outer shell. The wireframe glows in cold blue-white with faint CRT bloom. Vast dark indigo-black negative space. Mathematical, mysterious, minimal. Film grain. No people, no text.";

const modules = [
  { key: "proactive", number: "01", img: PROACTIVE_IMG },
  { key: "auto", number: "02", img: AUTO_IMG },
  { key: "human", number: "03", img: HUMAN_IMG },
  { key: "model", number: "04", img: MODEL_IMG },
] as const;

export function ProductModulesSection() {
  const t = useTranslations("HomePageV4.ProductModules");
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Track active module for counter
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (v < 0.12) {
        setActiveIdx(0);
        return;
      }
      const normalized = (v - 0.12) / 0.88;
      const idx = Math.min(Math.floor(normalized * 4), 3);
      setActiveIdx((prev) => (prev !== idx ? idx : prev));
    });
  }, [scrollYProgress]);

  // Phase 0: Header (0 → 0.15)
  const headerOpacity = useTransform(
    scrollYProgress,
    [0, 0.04, 0.1, 0.15],
    [0, 1, 1, 0],
  );
  const headerY = useTransform(
    scrollYProgress,
    [0, 0.04, 0.1, 0.15],
    [50, 0, 0, -30],
  );

  // Module phases: each gets ~22% of remaining range (0.12 → 1.0)
  // M0: 0.12-0.34, M1: 0.34-0.56, M2: 0.56-0.78, M3: 0.78-1.0
  const m0Opacity = useTransform(
    scrollYProgress,
    [0.1, 0.15, 0.3, 0.34],
    [0, 1, 1, 0],
  );
  const m0Scale = useTransform(scrollYProgress, [0.1, 0.18], [1.08, 1]);
  const m0TextY = useTransform(scrollYProgress, [0.13, 0.2], [40, 0]);
  const m0TextOpacity = useTransform(
    scrollYProgress,
    [0.13, 0.2, 0.3, 0.34],
    [0, 1, 1, 0],
  );

  const m1Opacity = useTransform(
    scrollYProgress,
    [0.34, 0.38, 0.52, 0.56],
    [0, 1, 1, 0],
  );
  const m1Scale = useTransform(scrollYProgress, [0.34, 0.42], [1.08, 1]);
  const m1TextY = useTransform(scrollYProgress, [0.36, 0.43], [40, 0]);
  const m1TextOpacity = useTransform(
    scrollYProgress,
    [0.36, 0.43, 0.52, 0.56],
    [0, 1, 1, 0],
  );

  const m2Opacity = useTransform(
    scrollYProgress,
    [0.56, 0.6, 0.74, 0.78],
    [0, 1, 1, 0],
  );
  const m2Scale = useTransform(scrollYProgress, [0.56, 0.64], [1.08, 1]);
  const m2TextY = useTransform(scrollYProgress, [0.58, 0.65], [40, 0]);
  const m2TextOpacity = useTransform(
    scrollYProgress,
    [0.58, 0.65, 0.74, 0.78],
    [0, 1, 1, 0],
  );

  const m3Opacity = useTransform(
    scrollYProgress,
    [0.78, 0.82, 0.95, 1],
    [0, 1, 1, 1],
  );
  const m3Scale = useTransform(scrollYProgress, [0.78, 0.86], [1.08, 1]);
  const m3TextY = useTransform(scrollYProgress, [0.8, 0.87], [40, 0]);
  const m3TextOpacity = useTransform(
    scrollYProgress,
    [0.8, 0.87],
    [0, 1],
  );

  const imgOpacities = [m0Opacity, m1Opacity, m2Opacity, m3Opacity];
  const imgScales = [m0Scale, m1Scale, m2Scale, m3Scale];
  const textOpacities = [m0TextOpacity, m1TextOpacity, m2TextOpacity, m3TextOpacity];
  const textYs = [m0TextY, m1TextY, m2TextY, m3TextY];

  return (
    <>
      {/* Desktop: scroll-driven full-viewport slideshow */}
      <div
        ref={containerRef}
        className="hidden lg:block relative"
        style={{ height: "400vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Module image layers */}
          {modules.map((mod, i) => (
            <motion.div
              key={mod.key}
              className="absolute inset-0"
              style={{ opacity: imgOpacities[i], scale: imgScales[i] }}
            >
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(mod.img)}?ratio=landscape`}
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
            <p className="mt-4 text-white/40 text-base md:text-lg max-w-2xl text-center leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Module text overlays */}
          {modules.map((mod, i) => (
            <motion.div
              key={`text-${mod.key}`}
              className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
              style={{ opacity: textOpacities[i], y: textYs[i] }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="font-IBMPlexMono text-sm text-[#4ade80]">
                  {mod.number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#4ade80]/80 border border-[#4ade80]/20 bg-white/[0.05]">
                  {t(`${mod.key}.badge`)}
                </span>
              </div>
              <h3 className="font-EuclidCircularA font-medium text-2xl md:text-4xl text-white mb-3 max-w-lg">
                {t(`${mod.key}.title`)}
              </h3>
              <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-md">
                {t(`${mod.key}.description`)}
              </p>
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
                {String(modules.length).padStart(2, "0")}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: stacked full-bleed cards */}
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
            <p className="mt-3 text-white/40 text-sm max-w-lg leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          <div className="space-y-4">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.key}
                className="relative rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.08 * i }}
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(mod.img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/40 to-transparent" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-IBMPlexMono text-xs text-[#4ade80]">
                      {mod.number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#4ade80]/80 border border-[#4ade80]/20 bg-white/[0.05]">
                      {t(`${mod.key}.badge`)}
                    </span>
                  </div>
                  <h3 className="font-EuclidCircularA font-medium text-lg text-white mb-1">
                    {t(`${mod.key}.title`)}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {t(`${mod.key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
