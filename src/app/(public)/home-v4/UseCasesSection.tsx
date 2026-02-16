"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURED_IMG_1 =
  "A minimal retro-futuristic data visualization rendered as a physical object: a vintage circular pie chart made of colored acrylic segments (warm amber, sage green, soft gray) standing upright on a brass rod mount, against a clean cream background. The acrylic pieces are semi-transparent, catching and refracting warm natural light to create beautiful color overlaps and shadow patterns on the white surface below. The object suggests the elegance of data analysis reduced to its purest, most tactile form — information you can hold and examine. Inspired by the educational models and scientific demonstration instruments of the 1960s. Color palette: warm amber acrylic, sage green acrylic, translucent gray, brass mounting, cream background. No people, no screens, no text. Product photography with warm natural light. 8k resolution.";

const FEATURED_IMG_2 =
  "A vintage analog chart recorder — the kind used in seismology or meteorology stations in the 1970s — actively drawing a flowing trend line with a fine-tipped pen on continuously scrolling graph paper. The instrument has a clean aluminum housing with rounded edges and small control knobs. The pen traces an organic, undulating line that suggests market trends and human behavioral patterns. The graph paper has a subtle green grid. Warm side-light illuminates the mechanical beauty of the recording mechanism and the precision of the pen tip touching paper. The overall feeling is one of continuous observation — patient, systematic measurement of patterns over time. Color palette: aluminum silver, cream graph paper, green grid lines, warm natural light. No people, no digital displays. Scientific instrument product photography. 8k resolution.";

const FEATURED_IMG_3 =
  "A collection of vintage analog gauges and meters arranged in a neat grid on a white display board — the kind found in a 1960s power plant or early computing facility control room. Each gauge has a different purpose: some show pressure with sweeping needle dials, others show temperature with colored arc indicators, one has a moving coil meter. All share the same clean aesthetic: white faces, precise black markings, glass covers with chrome bezels. They represent a comprehensive dashboard for understanding complex systems — each meter capturing a different dimension of the same underlying reality. Warm ambient light creates subtle reflections on the glass faces and chrome frames. Color palette: white gauge faces, chrome bezels, red and green indicator zones, warm light. No people, no digital screens. Industrial equipment photography in the style of a design museum. 8k resolution.";

const featuredCases = [
  { key: "c1", img: FEATURED_IMG_1 },
  { key: "c2", img: FEATURED_IMG_2 },
  { key: "c3", img: FEATURED_IMG_3 },
] as const;

const compactCases = ["c4", "c5", "c6", "c7", "c8", "c9"] as const;

export function UseCasesSection() {
  const t = useTranslations("HomePageV4.UseCases");

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

          {/* Featured 3 — larger cards with images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {featuredCases.map(({ key, img }, i) => (
              <motion.div
                key={key}
                className={cn(
                  "group rounded-2xl overflow-hidden",
                  "bg-white border border-zinc-200 shadow-sm",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:border-zinc-300",
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
                  <span className="absolute top-4 left-4 font-IBMPlexMono text-xs text-white bg-zinc-900/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="p-5 md:p-6">
                  <h4 className="font-EuclidCircularA font-medium text-base text-zinc-900 mb-2">
                    {t(`cases.${key}.title`)}
                  </h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">
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
                  "bg-white border border-zinc-200 shadow-sm",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:border-zinc-300",
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
              >
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e] mb-3 block">
                  {String(i + 4).padStart(2, "0")}
                </span>
                <h4 className="font-EuclidCircularA font-medium text-sm text-zinc-900 mb-1.5">
                  {t(`cases.${key}.title`)}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
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
