"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const OBJECTIVE_PROMPT =
  "An abstract field of perfectly regular geometric particles — thousands of identical small luminous spheres arranged in a crystalline lattice that extends infinitely. The lattice is rendered in cool silver, pale blue, and white, mathematically precise. Some spheres pulse with faint amber warmth, creating subtle rhythm in the perfect grid. Precise measurement lines and calibration marks float ghostlike in the background. Deeply symmetric and controlled. Subtle retro quality — slight chromatic aberration, fine analog film grain, the palette of a 1970s scientific journal. Style: generative algorithmic art meets vintage scientific visualization. Abstract, contemplative, beautiful in its mathematical precision. No recognizable objects, no people, no text.";

const SUBJECTIVE_PROMPT =
  "An abstract organic nebula of flowing color fields — warm amber, coral pink, sage green, and deep indigo swirl and merge like pigment dropped in still water, captured in infinite slow motion. Within the flowing color currents, subtle particle systems create fleeting structure — brief geometric patterns that crystallize and dissolve like half-formed thoughts. The forms feel alive, breathing, unpredictable. Fine particles scatter at the edges into warm cream negative space like spores. Subtle film grain and gentle chromatic aberration give it analog warmth. Style: abstract expressionism meets generative art meets retro sci-fi book cover. Deeply organic, emotional, mysterious, impossible to fully comprehend. No recognizable objects, no people, no text.";

export function ManifestoSection() {
  const t = useTranslations("HomePageV4.Manifesto");

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Prelude */}
        <motion.p
          className={cn(
            "font-EuclidCircularA text-zinc-400 text-center",
            "text-sm md:text-base",
            "zh:text-xs zh:md:text-sm",
            "mb-10 md:mb-14 max-w-xl mx-auto leading-relaxed",
          )}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {t("prelude")}
        </motion.p>

        {/* Diptych — two visual panels */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Left — Objective */}
          <motion.div
            className="group relative aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3] rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=square`}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex items-end p-6 md:p-8 lg:p-10">
              <h2
                className={cn(
                  "font-EuclidCircularA font-medium tracking-tight text-white",
                  "text-2xl sm:text-3xl md:text-2xl lg:text-4xl",
                  "zh:text-xl zh:sm:text-2xl zh:md:text-xl zh:lg:text-3xl zh:tracking-wide",
                  "leading-[1.2]",
                )}
              >
                {t("line1")}
              </h2>
            </div>
          </motion.div>

          {/* Right — Subjective */}
          <motion.div
            className="group relative aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3] rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Image
              src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=square`}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/30 to-transparent" />

            {/* Text */}
            <div className="absolute inset-0 flex items-end p-6 md:p-8 lg:p-10">
              <h2
                className={cn(
                  "font-EuclidCircularA font-medium tracking-tight",
                  "text-2xl sm:text-3xl md:text-2xl lg:text-4xl",
                  "zh:text-xl zh:sm:text-2xl zh:md:text-xl zh:lg:text-3xl zh:tracking-wide",
                  "leading-[1.2]",
                  "text-[#4ade80]",
                )}
              >
                {t("line2")}
              </h2>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
