"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PERSONA_IMG =
  "A vast bird's-eye view of hundreds of tiny pixel-art figures, each standing on their own small circular platform arranged in a loose organic grid extending toward the horizon. Every figure is uniquely designed — different colors, proportions, poses, accessories — no two alike. Some platforms glow warmer (amber, coral), others cooler (teal, indigo), representing different personality profiles. Faint dotted lines connect certain figures, showing behavioral similarities. The formation dissolves at far edges into scattered particles and geometric dust. Background shifts from warm dark charcoal to soft amber at the horizon. Style: precise isometric pixel art with atmospheric perspective and subtle volumetric lighting from below. An infinite library of unique identities. No text.";

const SAGE_IMG =
  "An abstract landscape of layered translucent geological strata in cross-section — each layer a different warm tone (amber, coral, sage green, cream, deep ochre) with different textures: some crystalline, some flowing like liquid, some granular like ancient sand. Luminous particles migrate between layers through thin vertical channels, carrying knowledge upward. The topmost layer emits a soft glow. The composition suggests immense depth and accumulated understanding. Retro quality — subtle halftone dots, the color reproduction of vintage scientific illustration. Style: abstract geological art meets generative visualization. Deep, contemplative, ancient yet alive. No recognizable objects, no people, no text.";

const PANEL_IMG =
  "A top-down view of 8-10 distinctly colored pixel-art figures arranged in a circle on a minimal floating platform. Each figure is a different vibrant color (coral, teal, amber, indigo, sage, pink) with unique poses — speaking, listening, gesturing, contemplating. At the center, an abstract swirl of particles and geometric shapes hovers — collective intelligence made visible. Thin luminous threads connect each figure to the center and to neighbors. Some figures appear solid (real respondents), others have subtle pixel-transparency (AI personas). The platform floats in clean warm cream space. Style: pixel art with generative-art center composition. Clean, modern, collaborative. No text.";


export function SubjectiveModelSection() {
  const t = useTranslations("HomePageV4.SubjectiveModel");

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
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                <h3 className="font-EuclidCircularA font-medium text-2xl md:text-3xl text-white mb-3">
                  {t("persona.title")}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-sm mb-4">
                  {t("persona.description")}
                </p>
                <div className="inline-flex items-center self-start px-3 py-1.5 rounded-full bg-[#2d8a4e]/[0.15] border border-[#2d8a4e]/30">
                  <span className="font-IBMPlexMono text-xs text-[#4ade80]">
                    {t("persona.stat")}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Sage */}
            <motion.div
              className={cn(
                "md:col-span-6 group rounded-2xl overflow-hidden",
                "bg-white border border-zinc-200 shadow-sm",
                "transition-all duration-300",
                "hover:shadow-lg hover:border-zinc-300",
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
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-zinc-900 mb-2">
                  {t("sage.title")}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  {t("sage.description")}
                </p>
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e]/70">
                  {t("sage.stat")}
                </span>
              </div>
            </motion.div>

            {/* Panel */}
            <motion.div
              className={cn(
                "md:col-span-6 group rounded-2xl overflow-hidden",
                "bg-white border border-zinc-200 shadow-sm",
                "transition-all duration-300",
                "hover:shadow-lg hover:border-zinc-300",
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
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-zinc-900 mb-2">
                  {t("panel.title")}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  {t("panel.description")}
                </p>
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e]/70">
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
