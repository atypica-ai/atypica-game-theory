"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PERSONA_IMG =
  "Hundreds of small translucent glowing orbs floating in dark space, each with a subtly different warm color inside, abstract bokeh particles, macro photography, dreamy atmosphere, no people, 8k";

const SAGE_IMG =
  "Ancient leather-bound book pages illuminated by warm golden candlelight, close-up macro showing paper texture, atmospheric dust particles in light beam, no text readable, moody still life photography, 8k";

const PANEL_IMG =
  "Aerial overhead view of a round conference table with many empty chairs arranged in circle, dramatic single spotlight from above, dark surroundings, minimalist architectural photography, no people, 8k";


export function SubjectiveModelSection() {
  const t = useTranslations("HomePageV4.SubjectiveModel");

  return (
    <section className="py-24 md:py-32 border-t border-white/[0.06]">
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
              <div className="w-8 h-px bg-[#00ff00]" />
              <span className="font-IBMPlexMono text-xs text-[#00ff00] uppercase tracking-[0.2em]">
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

          {/* Magazine layout — 1 featured + 2 side */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Featured — Persona (spans 6 cols, taller) */}
            <motion.div
              className="md:col-span-6 md:row-span-2 group relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="relative aspect-[3/4] md:h-full md:min-h-[500px]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(PERSONA_IMG)}?ratio=square`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/30 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                <h3 className="font-EuclidCircularA font-medium text-2xl md:text-3xl text-white mb-3">
                  {t("persona.title")}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-sm mb-4">
                  {t("persona.description")}
                </p>
                <div className="inline-flex items-center self-start px-3 py-1.5 rounded-full bg-[#00ff00]/[0.08] border border-[#00ff00]/20">
                  <span className="font-IBMPlexMono text-xs text-[#00ff00]/80">
                    {t("persona.stat")}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Sage */}
            <motion.div
              className={cn(
                "md:col-span-6 group rounded-2xl overflow-hidden",
                "bg-white/[0.03] border border-white/[0.06]",
                "transition-all duration-300",
                "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
              )}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative aspect-[2/1] overflow-hidden">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SAGE_IMG)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-white mb-2">
                  {t("sage.title")}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed mb-3">
                  {t("sage.description")}
                </p>
                <span className="font-IBMPlexMono text-xs text-[#00ff00]/60">
                  {t("sage.stat")}
                </span>
              </div>
            </motion.div>

            {/* Panel */}
            <motion.div
              className={cn(
                "md:col-span-6 group rounded-2xl overflow-hidden",
                "bg-white/[0.03] border border-white/[0.06]",
                "transition-all duration-300",
                "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
              )}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative aspect-[2/1] overflow-hidden">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(PANEL_IMG)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-white mb-2">
                  {t("panel.title")}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed mb-3">
                  {t("panel.description")}
                </p>
                <span className="font-IBMPlexMono text-xs text-[#00ff00]/60">
                  {t("panel.stat")}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
