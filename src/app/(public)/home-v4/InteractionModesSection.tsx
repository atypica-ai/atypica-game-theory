"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const INTERACTION_HERO_PROMPT =
  "A wide panoramic dark space scene with several clusters of chunky low-resolution pixel-art ghost characters (each approximately 24×32 pixels, every pixel block large and prominent) on separate floating platforms. Each ghost has a varied ghost-like silhouette with crisp dark pixel outlines and flat solid body color. No anti-aliasing. Colors range from bold saturated (orange, blue, red, pink, purple, teal) to skin tones. Each uniquely characterized: square pixel eyes (some with sunglasses), varied mouths (some with beards), distinct head accessories (beanies, caps, helmets, mohawks, headphones). Left: two ghosts in one-on-one conversation with speech particles. Center: one green ghost addressing a semicircle of 8 ghosts. Right: 6 ghosts in circular discussion with particle cloud above. Far background: a lone ghost observing. Green luminous bridges connect platforms. Dark oval shadows. Dark charcoal background with scattered colorful particle dots. Wide panoramic. No text.";

export function InteractionModesSection() {
  const t = useTranslations("HomePageV4.InteractionModes");

  const methods = t.raw("methods") as string[];
  const modalities = t.raw("modalities") as string[];

  return (
    <section className="py-24 md:py-32 border-t border-zinc-200">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Wide hero image with overlaid header */}
          <motion.div
            className="relative rounded-2xl overflow-hidden mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative aspect-[21/9] md:aspect-[3/1]">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(INTERACTION_HERO_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-zinc-900/10" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-px bg-[#4ade80]" />
                <span className="font-IBMPlexMono text-xs text-[#4ade80] uppercase tracking-[0.2em]">
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
              <p className="mt-3 text-white/50 text-sm md:text-base max-w-xl">
                {t("subtitle")}
              </p>
            </div>
          </motion.div>

          {/* Two columns below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Methods */}
            <motion.div
              className={cn(
                "p-6 md:p-8 rounded-2xl",
                "bg-white border border-zinc-200 shadow-sm",
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-zinc-900">
                  {t("methodsTitle")}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#2d8a4e]/70 border border-[#2d8a4e]/20 bg-[#2d8a4e]/[0.05]">
                  {t("methodsTag")}
                </span>
              </div>
              <div className="space-y-3">
                {methods.map((method, i) => (
                  <div
                    key={method}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl",
                      "bg-zinc-50 border border-zinc-100",
                      "transition-all duration-200",
                      "hover:border-[#2d8a4e]/20 hover:bg-[#2d8a4e]/[0.03]",
                    )}
                  >
                    <span className="font-IBMPlexMono text-[10px] text-[#2d8a4e]/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-EuclidCircularA text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                      {method}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Modalities */}
            <motion.div
              className={cn(
                "p-6 md:p-8 rounded-2xl",
                "bg-white border border-zinc-200 shadow-sm",
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-EuclidCircularA font-medium text-lg text-zinc-900">
                  {t("modalitiesTitle")}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#2d8a4e]/70 border border-[#2d8a4e]/20 bg-[#2d8a4e]/[0.05]">
                  {t("modalitiesTag")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {modalities.map((modality) => (
                  <div
                    key={modality}
                    className={cn(
                      "flex items-center justify-center px-4 py-4 rounded-xl",
                      "bg-zinc-50 border border-zinc-100",
                      "transition-all duration-200",
                      "hover:border-[#2d8a4e]/20 hover:bg-[#2d8a4e]/[0.03]",
                    )}
                  >
                    <span className="font-EuclidCircularA text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                      {modality}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
