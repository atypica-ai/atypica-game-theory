"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PROACTIVE_IMG =
  "A single thin ring of sparse green particles expanding outward in vast dark void — like a ripple frozen in still water. Inside the ring, emptiness. Outside, a few scattered particle fragments drifting. The ring is barely there, just a faint suggestion of constant quiet observation. Extremely minimal composition — almost entirely dark blue-gray negative space. Cold palette with green as the only color. Film grain. No people, no text.";

const AUTO_IMG =
  "Three small abstract forms floating in a line across vast dark space — left: a rough fractured stone-like shard; center: a partially refined translucent geometric solid; right: a smooth perfect sphere with faint green internal glow. Between them, thin sparse particle streams suggest transformation from raw to refined. The three forms are tiny against enormous dark blue-gray void. Cold palette: steel gray, cool white, green accent on the sphere. Film grain. No people, no text.";

const HUMAN_IMG =
  "A crowd of 25-30 chunky low-resolution pixel-art ghost characters (each approximately 24×32 pixels, every pixel block large and prominent) gathered around one slightly larger ghost glowing with a subtle green aura — the human researcher among AI personas. Each ghost has a varied ghost-like silhouette — some rounder, some taller, some wider — with crisp dark pixel outlines and a single flat body color. No anti-aliasing. The crowd is diverse: bold saturated colors (orange, blue, red, pink, purple, teal), skin tones, and grays. Each uniquely characterized with square pixel eyes (some with sunglasses), varied mouths (some with beards), and distinct head accessories (beanies, caps, helmets, mohawks, headphones, antlers). Thin green luminous threads connect the central ghost to the crowd. A few ghosts at the edges are half-transparent, assembling from loose pixels. Each casts a small dark oval shadow. Dark charcoal background with scattered colorful particle dots. No text.";

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
