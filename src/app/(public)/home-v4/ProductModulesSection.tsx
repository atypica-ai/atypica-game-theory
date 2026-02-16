"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PROACTIVE_IMG =
  "A vintage radar display screen from a 1960s maritime or aviation control room, showing concentric green sweep lines on a dark circular CRT display. The radar unit is housed in a beautifully designed brushed aluminum console with rounded edges and precise toggle switches, reminiscent of Braun's industrial design language. The sweep line illuminates abstract clustered dots that suggest patterns of movement and activity. Warm ambient light from a desk lamp to the side creates a soft glow on the metal surface. The scene conveys the idea of always-on intelligence — quietly scanning, always listening, detecting signals before they become obvious. Color palette: dark green phosphor on black screen, warm aluminum housing, cream desktop surface. No people, no modern screens, no digital interfaces. Retro-futuristic product photography style. 8k resolution.";

const AUTO_IMG =
  "A beautifully arranged collection of vintage scientific instruments on a clean white laboratory desk, shot from a slightly elevated angle. Includes a small brass-and-glass microscope, a mechanical stopwatch, a slide rule, and a stack of neatly organized index cards — all bathed in warm natural light from a large window. The composition suggests methodical, automated workflow — each instrument ready for the next step in a systematic research process. Inspired by the still-life photography of Irving Penn and the product aesthetic of 1970s laboratory equipment catalogs. Color palette: warm brass, glass, white surfaces, natural wood tones. No people, no computers, no modern technology. Clean, bright, organized feeling. Slight film grain. 8k resolution.";

const HUMAN_IMG =
  "Two vintage microphones from the 1950s — perhaps RCA ribbon microphones — positioned facing each other on elegant chrome stands against a warm cream background. The microphones have that distinctive art deco industrial beauty: chrome grilles, Bakelite elements, fabric-covered cables. Soft directional light creates subtle metallic reflections and gentle shadows. The composition suggests intimate conversation, dialogue, the act of listening and speaking. The space between the two microphones is as important as the microphones themselves — it represents the conversation space. Color palette: chrome silver, warm cream background, subtle warm tones. No people, no modern equipment, no text. Elegantly minimal. Product photography style reminiscent of a design museum catalog. 8k resolution.";

const MODEL_IMG =
  "An abstract geometric wireframe sculpture made of thin brass wire, sitting on a white pedestal against a cream background. The wireframe suggests a human head in profile but is purely geometric — made of interconnected triangles and polygons that create a translucent, skeletal form. Light passes through the structure, casting intricate shadow patterns on the white surface below. The sculpture represents the mathematical modeling of human cognition — complex internal structure rendered visible through elegant abstraction. Inspired by the geometric sculptures of Naum Gabo and the wireframe aesthetic of early computer graphics rendered as physical objects. Color palette: warm brass wire, white pedestal, cream background, golden shadow patterns. No actual people, no digital screens, no electronics. Art gallery product photography. 8k resolution.";

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
