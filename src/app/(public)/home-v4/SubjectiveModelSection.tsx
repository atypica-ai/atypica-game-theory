"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const PERSONA_IMG =
  "A vintage wooden card catalog cabinet — the kind found in mid-century libraries — with dozens of small brass-handled drawers, some slightly ajar revealing neatly arranged index cards inside. The cabinet is made of warm honey-toned oak with age patina. Soft natural light from the left illuminates the brass fittings and creates warm highlights on the wood grain. A few index cards rest on top of the cabinet, suggesting active use. The image represents a systematic collection of individual identities — each drawer containing a unique persona, a unique life. The visual metaphor bridges the analog world of careful human cataloging with the digital world of AI persona modeling. Color palette: warm honey oak, brass gold, cream card stock, soft natural light. No people, no computers, no modern technology. Shot in the style of a documentary photograph of a beautiful mid-century library. 8k resolution.";

const SAGE_IMG =
  "A stack of vintage leather-bound encyclopedias and reference books arranged on a clean white marble shelf, photographed from a slight angle. The books have embossed gold lettering on their spines and rich brown leather covers with age-appropriate patina. A pair of vintage round tortoiseshell reading glasses rests on top of the stack. Warm directional light from above creates soft shadows and highlights the texture of the leather and gilt edges. The composition suggests accumulated wisdom, expertise across multiple domains, the weight and authority of deep knowledge. Inspired by the still-life photography tradition and the aesthetic of a private study in a distinguished academic institution. Color palette: rich brown leather, gold embossing, white marble, tortoiseshell amber. No people, no digital devices, no modern elements. Warm and scholarly atmosphere. 8k resolution.";

const PANEL_IMG =
  "An overhead view of a vintage wooden boardroom table with a precisely arranged circle of small brass nameplates — each nameplate blank, suggesting participants yet to arrive. In the center of the table sits an elegant brass bell and a small vintage microphone. The table surface is rich mahogany with a warm polish. The scene is lit by a single pendant lamp from directly above, creating a pool of warm light on the table surface with the edges fading to soft shadow. The composition represents a panel discussion, a gathering of diverse perspectives, collective intelligence organized around a shared purpose. Inspired by the aesthetic of mid-century institutional design and the photography of Candida Höfer. Color palette: warm mahogany, brass gold, soft warm light, gentle shadows. No people, no modern technology, no screens. Architectural photography style. 8k resolution.";


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
