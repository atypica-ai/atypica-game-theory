"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PROACTIVE_IMG =
  "An abstract visualization of invisible scanning waves propagating through dark warm space. Concentric rings of luminous particles emanate outward from an unseen center — each ring a different warm tone: amber, gold, soft green. The particles are sparse, precise, geometric. Between the expanding rings, faint abstract debris drifts — tiny geometric shards, broken grid segments, scattered symbols too small to read. The outermost rings dissolve into entropy. Background: deep warm charcoal with subtle analog noise. Style: minimal generative art with retro sci-fi atmosphere — an oscilloscope display reimagined as fine art. Quiet, vigilant, beautiful. No recognizable objects, no people, no text.";

const AUTO_IMG =
  "An abstract flow of geometric forms transforming through space — rough crystalline shapes on the left gradually refine into smooth luminous solids on the right, as if invisible forces process and perfect them stage by stage. Particle streams connect each phase like a river of data. Colors shift from cool raw tones (pale gray, ice blue) to warm refined tones (amber, gold, cream). The forms float in a vast warm void with subtle depth. Retro film grain overlay. Style: abstract process art — entropy reversing in a sci-fi universe. Minimal, contemplative, suggesting transformation without showing machinery. No recognizable objects, no people, no text.";

const HUMAN_IMG =
  "A crowd of 30-40 tiny pixel-art figures in diverse colors gathered around a slightly larger, softly glowing figure at center — the human researcher among AI personas. The smaller figures face inward, some raising tiny hands, others in animated discussion. Thin luminous threads flow between the central figure and the crowd, forming a radial network. Some threads carry tiny floating geometric particles — fragments of insight. The scene sits on a minimal floating surface against a warm gray-to-cream gradient. A few figures at the edges are half-formed from scattered pixels, suggesting they are being simulated into existence. Style: clean pixel art with atmospheric lighting. No text.";

const MODEL_IMG =
  "An abstract wireframe structure floating in deep indigo space — nested transparent geometric shells (icosahedron within dodecahedron within cube) rotate imperceptibly at different speeds. Inside the innermost shell, a dense cluster of warm amber particles pulses rhythmically. Fine luminous connection lines radiate outward through all shells, creating a web of relationships. Retro vector-graphics aesthetic — glowing cyan-white lines with subtle CRT bloom, reminiscent of early 1980s computer graphics. Color palette: deep indigo background, cyan-white wireframe, warm amber-gold core. Mysterious and mathematical. No recognizable objects, no people, no text.";

const modules = [
  { key: "proactive", number: "01", img: PROACTIVE_IMG },
  { key: "auto", number: "02", img: AUTO_IMG },
  { key: "human", number: "03", img: HUMAN_IMG },
  { key: "model", number: "04", img: MODEL_IMG },
] as const;

export function ProductModulesSection() {
  const t = useTranslations("HomePageV4.ProductModules");

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
            <p className="mt-4 text-zinc-500 text-base md:text-lg max-w-2xl leading-relaxed">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Bento grid — first item featured wide */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Featured: Proactive mode — full width banner */}
            <motion.div
              className="md:col-span-12 group relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative aspect-[21/9] md:aspect-[3/1]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(modules[0].img)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-zinc-900/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/70 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-IBMPlexMono text-xs text-[#4ade80]">
                    {modules[0].number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#4ade80]/80 border border-[#4ade80]/20 bg-white/[0.05]">
                    {t(`${modules[0].key}.badge`)}
                  </span>
                </div>
                <h3 className="font-EuclidCircularA font-medium text-xl md:text-3xl text-white mb-2 max-w-lg">
                  {t(`${modules[0].key}.title`)}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-lg">
                  {t(`${modules[0].key}.description`)}
                </p>
              </div>
            </motion.div>

            {/* Remaining 3 — each with image header */}
            {modules.slice(1).map((mod, i) => (
              <motion.div
                key={mod.key}
                className={cn(
                  "md:col-span-4 group rounded-2xl overflow-hidden",
                  "bg-white border border-zinc-200 shadow-sm",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:border-zinc-300",
                )}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.15 + 0.08 * i }}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(mod.img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-IBMPlexMono text-xs text-[#2d8a4e]">
                      {mod.number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#2d8a4e]/70 border border-[#2d8a4e]/20 bg-[#2d8a4e]/[0.05]">
                      {t(`${mod.key}.badge`)}
                    </span>
                  </div>
                  <h3 className="font-EuclidCircularA font-medium text-base md:text-lg text-zinc-900 mb-2">
                    {t(`${mod.key}.title`)}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {t(`${mod.key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
