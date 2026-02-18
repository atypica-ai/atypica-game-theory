"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const OBJECTIVE_PROMPT =
  "A perfect geometric lattice of small identical spheres extending into cold dark space, rendered in cool silver-white. The lattice is mathematically precise. A few spheres glow with faint green light, breaking the monotony. The structure fades into void at the edges — spheres dissolving into sparse particles and then into nothing. Vast dark blue-gray negative space surrounds the lattice. Cold, precise, silent. Film grain. No people, no text.";

const SUBJECTIVE_PROMPT =
  "A single amorphous cloud-like form floating in dark space — soft, organic, slowly shifting. Made of thousands of tiny particles in muted cool tones (sage, dusty blue, pale green) that drift and swirl but never resolve into a recognizable shape. At its core, a faint warm glow — the only warmth in the image. The form breathes against vast cold dark emptiness. Sparse particles scatter outward into the void. Mysterious, alive, ungovernable. Film grain. No people, no text.";

export function ManifestoSection() {
  const t = useTranslations("HomePageV4.Manifesto");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Phase 1: Prelude text (0 → 0.3)
  const preludeOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.22, 0.3],
    [0, 1, 1, 0],
  );
  const preludeY = useTransform(scrollYProgress, [0, 0.08], [40, 0]);

  // Phase 2: Left / Objective (0.25 → 0.6)
  const leftOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.33, 0.52, 0.6],
    [0, 1, 1, 0],
  );
  const leftScale = useTransform(scrollYProgress, [0.25, 0.4], [1.08, 1]);
  const leftTextOpacity = useTransform(
    scrollYProgress,
    [0.3, 0.38, 0.52, 0.6],
    [0, 1, 1, 0],
  );
  const leftTextY = useTransform(scrollYProgress, [0.3, 0.38], [40, 0]);

  // Phase 3: Right / Subjective (0.55 → 1.0)
  const rightOpacity = useTransform(
    scrollYProgress,
    [0.55, 0.63, 0.92, 1],
    [0, 1, 1, 1],
  );
  const rightScale = useTransform(scrollYProgress, [0.55, 0.7], [1.08, 1]);
  const rightTextOpacity = useTransform(
    scrollYProgress,
    [0.6, 0.68],
    [0, 1],
  );
  const rightTextY = useTransform(scrollYProgress, [0.6, 0.68], [40, 0]);

  return (
    <>
      {/* Desktop: scroll-driven full-bleed crossfade */}
      <div
        ref={containerRef}
        className="hidden md:block relative"
        style={{ height: "200vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Left image layer */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: leftOpacity, scale: leftScale }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/20 to-[#0a0a0c]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 via-transparent to-transparent" />
          </motion.div>

          {/* Right image layer (renders on top of left during crossfade) */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: rightOpacity, scale: rightScale }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=landscape`}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/20 to-[#0a0a0c]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 via-transparent to-transparent" />
          </motion.div>

          {/* Prelude text — centered */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center px-4"
            style={{ opacity: preludeOpacity, y: preludeY }}
          >
            <p
              className={cn(
                "font-EuclidCircularA text-white/50 text-center",
                "text-base md:text-lg lg:text-xl",
                "zh:text-sm zh:md:text-base",
                "max-w-xl leading-relaxed",
              )}
            >
              {t("prelude")}
            </p>
          </motion.div>

          {/* Left manifesto text — bottom left */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
            style={{ opacity: leftTextOpacity, y: leftTextY }}
          >
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-white",
                "text-3xl md:text-5xl lg:text-6xl",
                "zh:text-2xl zh:md:text-4xl zh:lg:text-5xl zh:tracking-wide",
                "leading-[1.15]",
              )}
            >
              {t("line1")}
            </h2>
          </motion.div>

          {/* Right manifesto text — bottom left, green */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-16"
            style={{ opacity: rightTextOpacity, y: rightTextY }}
          >
            <h2
              className={cn(
                "font-EuclidCircularA font-medium tracking-tight text-[#4ade80]",
                "text-3xl md:text-5xl lg:text-6xl",
                "zh:text-2xl zh:md:text-4xl zh:lg:text-5xl zh:tracking-wide",
                "leading-[1.15]",
              )}
            >
              {t("line2")}
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Mobile: stacked with scroll-triggered reveals */}
      <section className="md:hidden py-12 px-4">
        <motion.p
          className={cn(
            "font-EuclidCircularA text-white/40 text-center text-sm",
            "zh:text-xs",
            "max-w-sm mx-auto leading-relaxed mb-8",
          )}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t("prelude")}
        </motion.p>

        <motion.div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=square`}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-end p-5">
            <h2
              className={cn(
                "font-EuclidCircularA font-medium text-2xl text-white leading-[1.2]",
                "zh:text-xl",
              )}
            >
              {t("line1")}
            </h2>
          </div>
        </motion.div>

        <motion.div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Image
            src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=square`}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-end p-5">
            <h2
              className={cn(
                "font-EuclidCircularA font-medium text-2xl text-[#4ade80] leading-[1.2]",
                "zh:text-xl",
              )}
            >
              {t("line2")}
            </h2>
          </div>
        </motion.div>
      </section>
    </>
  );
}
