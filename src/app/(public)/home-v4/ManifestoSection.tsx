"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const OBJECTIVE_PROMPT =
  "A close-up photograph of a vintage precision instrument — a beautifully engineered brass and steel mechanical calculator or adding machine from the 1960s, inspired by Olivetti industrial design. Each gear, lever, and numbered wheel is perfectly machined, catching warm side-light that reveals the metallic grain and patina. The background is a soft cream-colored surface. The image conveys the beauty of systematic, mechanical precision — the objective, measurable world reduced to interlocking parts. Color palette: warm brass, brushed steel silver, cream white background. Style: product photography reminiscent of a Dieter Rams exhibition catalog. No people, no digital screens, no modern technology. Slight warm film grain. 8k resolution.";

const SUBJECTIVE_PROMPT =
  "An abstract artistic composition of flowing ink in water, captured in extreme macro. Tendrils of warm amber and deep sienna pigment spiral and bloom through clear liquid, creating organic, unpredictable patterns that suggest emotion, intuition, and the fluid nature of human feeling. The background transitions from warm cream at the edges to deeper tones at the center. The forms are entirely abstract but feel alive — like watching thought itself take shape. Inspired by the fluid dynamics photography of high-speed cameras but with the warmth and softness of watercolor painting. Color palette: amber, sienna, warm cream, touches of sage green. No people, no objects, no text. Bright and luminous overall. Slight film grain texture. 8k resolution.";

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
