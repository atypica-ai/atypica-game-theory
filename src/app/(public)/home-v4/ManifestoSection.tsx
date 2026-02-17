"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const OBJECTIVE_PROMPT =
  "A perfect geometric lattice of small identical spheres extending into cold dark space, rendered in cool silver-white. The lattice is mathematically precise. A few spheres glow with faint green light, breaking the monotony. The structure fades into void at the edges — spheres dissolving into sparse particles and then into nothing. Vast dark blue-gray negative space surrounds the lattice. Cold, precise, silent. Film grain. No people, no text.";

const SUBJECTIVE_PROMPT =
  "A single amorphous cloud-like form floating in dark space — soft, organic, slowly shifting. Made of thousands of tiny particles in muted cool tones (sage, dusty blue, pale green) that drift and swirl but never resolve into a recognizable shape. At its core, a faint warm glow — the only warmth in the image. The form breathes against vast cold dark emptiness. Sparse particles scatter outward into the void. Mysterious, alive, ungovernable. Film grain. No people, no text.";

export function ManifestoSection() {
  const t = useTranslations("HomePageV4.Manifesto");

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Prelude */}
        <motion.p
          className={cn(
            "font-EuclidCircularA text-zinc-400 text-center",
            "text-sm md:text-base",
            "zh:text-xs zh:md:text-sm",
            "mb-10 md:mb-14 max-w-xl mx-auto leading-relaxed",
          )}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {t("prelude")}
        </motion.p>

        {/* Diptych — two visual panels */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Left — Objective */}
          <motion.div
            className="group relative aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3] rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=square`}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex items-end p-6 md:p-8 lg:p-10">
              <h2
                className={cn(
                  "font-EuclidCircularA font-medium tracking-tight text-white",
                  "text-2xl sm:text-3xl md:text-2xl lg:text-4xl",
                  "zh:text-xl zh:sm:text-2xl zh:md:text-xl zh:lg:text-3xl zh:tracking-wide",
                  "leading-[1.2]",
                )}
              >
                {t("line1")}
              </h2>
            </div>
          </motion.div>

          {/* Right — Subjective */}
          <motion.div
            className="group relative aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3] rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=square`}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex items-end p-6 md:p-8 lg:p-10">
              <h2
                className={cn(
                  "font-EuclidCircularA font-medium tracking-tight",
                  "text-2xl sm:text-3xl md:text-2xl lg:text-4xl",
                  "zh:text-xl zh:sm:text-2xl zh:md:text-xl zh:lg:text-3xl zh:tracking-wide",
                  "leading-[1.2]",
                  "text-[#4ade80]",
                )}
              >
                {t("line2")}
              </h2>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
