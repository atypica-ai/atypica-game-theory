"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PROACTIVE_IMG =
  "Abstract radar visualization, concentric pulsing rings emanating from center point in dark space, subtle green and blue glow, data visualization art, minimal, no text, 8k";

const AUTO_IMG =
  "Time-lapse light trails flowing through a dark corridor, long exposure photography, abstract motion blur, warm amber and cool blue streaks on deep black, 8k";

const HUMAN_IMG =
  "Two empty designer chairs facing each other in a warm-lit minimal concrete room, single pendant light, soft dramatic shadows, intimate interior, no people, editorial architecture photography, 8k";

const MODEL_IMG =
  "Abstract 3D wireframe translucent head silhouette dissolving into floating data particles, dark background, subtle green and white glow, no realistic features, digital art, 8k";

const modules = [
  { key: "proactive", number: "01", img: PROACTIVE_IMG },
  { key: "auto", number: "02", img: AUTO_IMG },
  { key: "human", number: "03", img: HUMAN_IMG },
  { key: "model", number: "04", img: MODEL_IMG },
] as const;

export function ProductModulesSection() {
  const t = useTranslations("HomePageV4.ProductModules");

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
            <p className="mt-4 text-white/40 text-base md:text-lg max-w-2xl leading-relaxed">
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
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-IBMPlexMono text-xs text-[#00ff00]">
                    {modules[0].number}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#00ff00]/70 border border-[#00ff00]/20 bg-[#00ff00]/[0.05]">
                    {t(`${modules[0].key}.badge`)}
                  </span>
                </div>
                <h3 className="font-EuclidCircularA font-medium text-xl md:text-3xl text-white mb-2 max-w-lg">
                  {t(`${modules[0].key}.title`)}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-lg">
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
                  "bg-white/[0.03] border border-white/[0.06]",
                  "transition-all duration-300",
                  "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-IBMPlexMono text-xs text-[#00ff00]">
                      {mod.number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#00ff00]/70 border border-[#00ff00]/20 bg-[#00ff00]/[0.05]">
                      {t(`${mod.key}.badge`)}
                    </span>
                  </div>
                  <h3 className="font-EuclidCircularA font-medium text-base md:text-lg text-white mb-2">
                    {t(`${mod.key}.title`)}
                  </h3>
                  <p className="text-sm text-white/40 leading-relaxed">
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
