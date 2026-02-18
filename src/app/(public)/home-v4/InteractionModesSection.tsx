"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const INTERACTION_HERO_PROMPT =
  "Wide panoramic dark void with three clusters of small floating geometric platforms at different positions. On each platform, tiny pixel-art persona figures stand and interact — face-as-body silhouettes in muted tones (pale gray, warm off-white, dusty blue). Left platform: two figures facing each other with a thin green energy arc between them. Center platform: a larger structure where one figure addresses a semicircle of many, thin green arrows radiating outward. Right platform: several figures in a tight ring with green particle flow circling between them. Thin single-pixel-width green dotted lines connect the three platforms across vast dark space. Most of the image is empty dark void. The platforms are cold gray stone, rough-textured. Cold palette: steel gray, dark indigo-charcoal, green accents. Film grain. Vast, quiet, panoramic. No text.";

export function InteractionModesSection() {
  const t = useTranslations("HomePageV4.InteractionModes");

  const methods = t.raw("methods") as string[];
  const modalities = t.raw("modalities") as string[];

  return (
    <section className="relative">
      {/* Sticky hero image background — desktop */}
      <div className="hidden md:block sticky top-0 h-[80vh] overflow-hidden z-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(INTERACTION_HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/30 to-[#0a0a0c]/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/50 via-transparent to-transparent" />

        {/* Title overlaid on image */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
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
      </div>

      {/* Mobile hero image — not sticky */}
      <div className="md:hidden relative aspect-[21/9] overflow-hidden">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(INTERACTION_HERO_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c]/80 via-[#0a0a0c]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-px bg-[#4ade80]" />
            <span className="font-IBMPlexMono text-xs text-[#4ade80] uppercase tracking-[0.2em]">
              {t("label")}
            </span>
          </div>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight text-white text-2xl",
              "zh:text-xl zh:tracking-wide",
            )}
          >
            {t("title")}
          </h2>
          <p className="mt-2 text-white/50 text-sm max-w-sm">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Content that scrolls over the sticky image */}
      <div className="relative z-10">
        {/* Gradient transition */}
        <div className="hidden md:block h-24 bg-gradient-to-b from-transparent to-[#0a0a0c]" />

        <div className="bg-[#0a0a0c] pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Methods */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="font-EuclidCircularA font-medium text-lg text-white">
                      {t("methodsTitle")}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#4ade80]/70 border border-[#4ade80]/20 bg-white/[0.03]">
                      {t("methodsTag")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {methods.map((method, i) => (
                      <motion.div
                        key={method}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl",
                          "bg-white/[0.02] border border-white/[0.06]",
                          "transition-all duration-300",
                          "hover:bg-[#2d8a4e]/[0.08] hover:border-[#4ade80]/20",
                        )}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.05 * i }}
                      >
                        <span className="font-IBMPlexMono text-[10px] text-[#4ade80]/40">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-EuclidCircularA text-sm text-white/60">
                          {method}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Modalities */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="font-EuclidCircularA font-medium text-lg text-white">
                      {t("modalitiesTitle")}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-IBMPlexMono uppercase tracking-wider text-[#4ade80]/70 border border-[#4ade80]/20 bg-white/[0.03]">
                      {t("modalitiesTag")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {modalities.map((modality, i) => (
                      <motion.div
                        key={modality}
                        className={cn(
                          "flex items-center justify-center px-4 py-4 rounded-xl",
                          "bg-white/[0.02] border border-white/[0.06]",
                          "transition-all duration-300",
                          "hover:bg-[#2d8a4e]/[0.08] hover:border-[#4ade80]/20",
                        )}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.04 * i }}
                      >
                        <span className="font-EuclidCircularA text-sm text-white/60">
                          {modality}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
