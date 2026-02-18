"use client";

import { cn } from "@/lib/utils";
import { motion, useSpring, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useState } from "react";

const OBJECTIVE_PROMPT =
  "Abstract retro-scientific instrument field viewed in perspective: precise modular grids, matte metal frames, thin calibration markings, and restrained green phosphor traces. The composition feels measurable, objective, and engineered. Massive negative space, charcoal and steel palette, faint film grain. No text, no people.";

const SUBJECTIVE_PROMPT =
  "Abstract emotional topology in dark space: soft drifting gradients, fractured signal ribbons, tiny HippyGhosts-like pixel silhouettes appearing and dissolving at edges. Organic but controlled, with subtle green pulse accents and analog film texture. Vast negative space. No text.";

export function ManifestoSection() {
  const t = useTranslations("HomePageV4.Manifesto");
  const [splitX, setSplitX] = useState(52);
  const smoothSplitX = useSpring(splitX, { stiffness: 140, damping: 26 });
  const splitClipPath = useTransform(
    smoothSplitX,
    (value) => `inset(0 0 0 ${value}%)`,
  );
  const splitLeft = useTransform(smoothSplitX, (value) => `${value}%`);

  const handleMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * 100;
    setSplitX(Math.max(16, Math.min(84, ratio)));
  }, []);

  return (
    <section className="relative py-20 md:py-28 bg-[#0a0a0c]">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-white/55 text-sm md:text-base max-w-2xl leading-relaxed mb-8 md:mb-10">
            {t("prelude")}
          </p>

          <div
            className="hidden md:block relative rounded-2xl border border-white/[0.12] overflow-hidden bg-black/30"
            onMouseMove={handleMove}
          >
            <div className="relative aspect-[16/8.5]">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=landscape`}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

              <motion.div
                className="absolute inset-0"
                style={{ clipPath: splitClipPath }}
              >
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=landscape`}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/25" />
              </motion.div>

              <motion.div
                className="absolute top-0 bottom-0 w-px bg-[#4ade80]/70"
                style={{ left: splitLeft }}
              />

              <div className="absolute inset-0 p-6 md:p-8 flex items-end justify-between pointer-events-none">
                <h2
                  className={cn(
                    "font-EuclidCircularA font-medium tracking-tight text-white max-w-md",
                    "text-2xl md:text-4xl lg:text-5xl",
                    "zh:text-xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
                  )}
                >
                  {t("line1")}
                </h2>
                <h2
                  className={cn(
                    "font-EuclidCircularA font-medium tracking-tight text-[#4ade80] max-w-md text-right",
                    "text-2xl md:text-4xl lg:text-5xl",
                    "zh:text-xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
                  )}
                >
                  {t("line2")}
                </h2>
              </div>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-white/[0.1]">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(OBJECTIVE_PROMPT)}?ratio=square`}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <h2 className="absolute bottom-4 left-4 right-4 font-EuclidCircularA font-medium text-2xl text-white zh:text-xl">
                {t("line1")}
              </h2>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-white/[0.1]">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(SUBJECTIVE_PROMPT)}?ratio=square`}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <h2 className="absolute bottom-4 left-4 right-4 font-EuclidCircularA font-medium text-2xl text-[#4ade80] zh:text-xl">
                {t("line2")}
              </h2>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
