"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURED_IMG_1 =
  "Macro close-up of eye iris reflecting colorful data visualizations, abstract and artistic, warm amber and cool blue tones, no full face, extreme close-up, editorial photography, 8k";

const FEATURED_IMG_2 =
  "Abstract topographic contour map made of glowing green lines on dark background, data landscape visualization, minimal and elegant, no text, 8k";

const FEATURED_IMG_3 =
  "Aerial view of a winding river through dark landscape at twilight, dramatic light reflecting on water surface, abstract nature photography, warm and cool tones, no people, 8k";

const featuredCases = [
  { key: "c1", img: FEATURED_IMG_1 },
  { key: "c2", img: FEATURED_IMG_2 },
  { key: "c3", img: FEATURED_IMG_3 },
] as const;

const compactCases = ["c4", "c5", "c6", "c7", "c8", "c9"] as const;

export function UseCasesSection() {
  const t = useTranslations("HomePageV4.UseCases");

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

          {/* Featured 3 — larger cards with images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {featuredCases.map(({ key, img }, i) => (
              <motion.div
                key={key}
                className={cn(
                  "group rounded-2xl overflow-hidden",
                  "bg-white/[0.03] border border-white/[0.06]",
                  "transition-all duration-300",
                  "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
                )}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.08 * i }}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(img)}?ratio=landscape`}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 font-IBMPlexMono text-xs text-[#00ff00]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="p-5 md:p-6">
                  <h4 className="font-EuclidCircularA font-medium text-base text-white mb-2">
                    {t(`cases.${key}.title`)}
                  </h4>
                  <p className="text-sm text-white/40 leading-relaxed">
                    {t(`cases.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compact 6 — text-only numbered list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {compactCases.map((key, i) => (
              <motion.div
                key={key}
                className={cn(
                  "group p-5 md:p-6 rounded-2xl",
                  "bg-white/[0.03] border border-white/[0.06]",
                  "transition-all duration-300",
                  "hover:border-[#00ff00]/20 hover:shadow-[0_0_30px_rgba(0,255,0,0.06)]",
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
              >
                <span className="font-IBMPlexMono text-xs text-[#00ff00] mb-3 block">
                  {String(i + 4).padStart(2, "0")}
                </span>
                <h4 className="font-EuclidCircularA font-medium text-sm text-white mb-1.5">
                  {t(`cases.${key}.title`)}
                </h4>
                <p className="text-xs text-white/35 leading-relaxed">
                  {t(`cases.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
