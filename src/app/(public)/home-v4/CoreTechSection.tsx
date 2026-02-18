"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const NODE_POSITIONS = [
  { angle: 0, key: "values" },
  { angle: 60, key: "risk" },
  { angle: 120, key: "emotion" },
  { angle: 180, key: "decision" },
  { angle: 240, key: "social" },
  { angle: 300, key: "cognitive" },
] as const;

export function CoreTechSection() {
  const t = useTranslations("HomePageV4.CoreTech");

  return (
    <section className="py-24 md:py-32 bg-[#111113]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-16 md:mb-20"
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

          {/* Orbit + features layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Orbit diagram — builds on scroll */}
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
                {/* Concentric circles */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/[0.04]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
                <motion.div
                  className="absolute inset-[14%] rounded-full border border-white/[0.08]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                />
                <motion.div
                  className="absolute inset-[35%] rounded-full border border-[#2d8a4e]/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                />

                {/* Center label */}
                <motion.div
                  className="absolute inset-[30%] flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#2d8a4e]/10 border border-[#2d8a4e]/30 flex items-center justify-center">
                      <span className="font-IBMPlexMono text-xs text-[#2d8a4e] font-bold">
                        {t("center")}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Rotating node ring */}
                <div
                  className="absolute inset-0"
                  style={{
                    animation: "spin 60s linear infinite",
                  }}
                >
                  {NODE_POSITIONS.map(({ angle, key }, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const r = 36;
                    const x =
                      Math.round((50 + r * Math.cos(rad)) * 100) / 100;
                    const y =
                      Math.round((50 + r * Math.sin(rad)) * 100) / 100;

                    return (
                      <motion.div
                        key={key}
                        className="absolute"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                        }}
                        initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
                        whileInView={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.4,
                          delay: 0.6 + 0.1 * i,
                          type: "spring",
                          stiffness: 200,
                        }}
                      >
                        <div
                          style={{
                            animation: "spin 60s linear infinite reverse",
                          }}
                        >
                          <div className="px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:bg-[#2d8a4e]/20 hover:border-[#4ade80]/40 hover:shadow-[0_0_15px_rgba(74,222,128,0.15)]">
                            <span className="font-EuclidCircularA text-[10px] md:text-xs text-white/60 transition-colors duration-300 hover:text-[#4ade80]">
                              {t(`nodes.${key}`)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Subtle glow */}
                <div className="absolute inset-[25%] rounded-full bg-[#2d8a4e]/[0.05] blur-xl" />
              </div>
            </motion.div>

            {/* Features list — staggered scroll-triggered reveal */}
            <div>
              <div className="space-y-4">
                {(t.raw("features") as string[]).map((feature, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.08 * i }}
                  >
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#2d8a4e] shrink-0" />
                    <span className="text-white/60 text-sm md:text-base leading-relaxed">
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2d8a4e]/30 bg-[#2d8a4e]/[0.08]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="w-2 h-2 rounded-full bg-[#2d8a4e] animate-pulse" />
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e]/80">
                  {t("filing")}
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
