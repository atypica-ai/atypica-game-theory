"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const SIMULATOR_PROMPT =
  "Abstract prismatic light refraction through crystal glass sculpture, rainbow spectrum splitting in dark void, macro photography, deep black background with vivid colorful light rays refracting, minimal and elegant, no people, 8k";

const RESEARCHER_PROMPT =
  "Overhead aerial view of two people sitting across a small round table in warm candlelight, intimate conversation, shallow depth of field, soft bokeh, no faces visible only hands and shoulders, warm amber tones, editorial photography, 8k";

export function ThesisSection() {
  const t = useTranslations("HomePageV4.Thesis");

  return (
    <section className="py-24 md:py-32 border-t border-white/[0.06]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header — centered for this section */}
          <motion.div
            className="text-center mb-16 md:mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#00ff00]" />
              <span className="font-IBMPlexMono text-xs text-[#00ff00] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#00ff00]" />
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
            <p className="mt-4 text-white/40 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              {t("description")}
            </p>
          </motion.div>

          {/* Two roles — asymmetric layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Simulator — larger, image-dominant */}
            <motion.div
              className="lg:col-span-7 group relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="relative aspect-[4/3] md:aspect-[16/10]">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SIMULATOR_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 to-transparent" />
              </div>

              {/* Overlaid text content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                <span className="font-IBMPlexMono text-[10px] text-[#00ff00] uppercase tracking-[0.2em] mb-3">
                  {t("simulator.tag")}
                </span>
                <h3 className="font-EuclidCircularA font-medium text-2xl md:text-3xl text-white mb-3">
                  {t("simulator.title")}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-md mb-4">
                  {t("simulator.description")}
                </p>
                <p className="font-IBMPlexMono text-xs text-[#00ff00]/50">
                  {t("simulator.stat")}
                </p>
              </div>
            </motion.div>

            {/* Researcher — taller, card-style with image */}
            <motion.div
              className={cn(
                "lg:col-span-5 group rounded-2xl overflow-hidden",
                "bg-white/[0.03] border border-white/[0.06]",
                "transition-all duration-300",
                "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
              )}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(RESEARCHER_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
              </div>
              <div className="p-6 md:p-8">
                <span className="font-IBMPlexMono text-[10px] text-[#00ff00] uppercase tracking-[0.2em] mb-3 block">
                  {t("researcher.tag")}
                </span>
                <h3 className="font-EuclidCircularA font-medium text-xl md:text-2xl text-white mb-3">
                  {t("researcher.title")}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed mb-5">
                  {t("researcher.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(t.raw("researcher.items") as string[]).map((item) => (
                    <span
                      key={item}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-EuclidCircularA",
                        "text-white/40 border border-white/[0.08] bg-white/[0.02]",
                        "transition-all duration-200",
                        "hover:text-[#00ff00] hover:border-[#00ff00]/20",
                      )}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
