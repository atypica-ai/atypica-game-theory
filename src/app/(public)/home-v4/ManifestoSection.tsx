"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const OBJECTIVE_PROMPT =
  "Aerial view of geometric glass building facade reflecting cold blue sky, minimalist crystalline architecture, precise grid pattern, frost-like surface texture, abstract structural photography, no people, deep blue and silver tones, 8k";

const SUBJECTIVE_PROMPT =
  "Warm amber light filtering through flowing translucent fabric layers, creating soft organic shadows and depth, intimate macro photography, golden hour warmth, no people, abstract textile art, 8k";

export function ManifestoSection() {
  const t = useTranslations("HomePageV4.Manifesto");

  return (
    <section className="relative py-20 md:py-28 overflow-hidden border-t border-white/[0.06]">
      <div className="container mx-auto px-4">
        {/* Prelude */}
        <motion.p
          className={cn(
            "font-EuclidCircularA text-white/30 text-center",
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
            {/* Cool overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-blue-950/20" />
            <div className="absolute inset-0 bg-[#0a0a0c]/30" />

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
            {/* Warm overlay with green tint */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-amber-950/10" />
            <div className="absolute inset-0 bg-[#0a0a0c]/30" />

            {/* Subtle green glow */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#00ff00]/[0.04] to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex items-end p-6 md:p-8 lg:p-10">
              <h2
                className={cn(
                  "font-EuclidCircularA font-medium tracking-tight",
                  "text-2xl sm:text-3xl md:text-2xl lg:text-4xl",
                  "zh:text-xl zh:sm:text-2xl zh:md:text-xl zh:lg:text-3xl zh:tracking-wide",
                  "leading-[1.2]",
                  "text-[#00ff00]",
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
