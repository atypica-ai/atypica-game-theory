"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

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
    <section className="py-24 md:py-32 bg-[#1a1a1a]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div className="mb-16 md:mb-20" {...fadeInUp}>
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
            {/* Orbit diagram */}
            <motion.div
              className="relative flex items-center justify-center"
              {...fadeInUp}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
                {/* Concentric circles */}
                <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
                <div className="absolute inset-[15%] rounded-full border border-white/[0.06]" />
                <div className="absolute inset-[30%] rounded-full border border-[#2d8a4e]/20" />

                {/* Center label */}
                <div className="absolute inset-[30%] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#2d8a4e]/10 border border-[#2d8a4e]/30 flex items-center justify-center">
                      <span className="font-IBMPlexMono text-xs text-[#2d8a4e] font-bold">
                        {t("center")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rotating node ring */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                  {NODE_POSITIONS.map(({ angle, key }) => {
                    const rad = (angle * Math.PI) / 180;
                    const r = 50;
                    const x = Math.round((50 + r * Math.cos(rad)) * 100) / 100;
                    const y = Math.round((50 + r * Math.sin(rad)) * 100) / 100;

                    return (
                      <motion.div
                        key={key}
                        className="absolute"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 60,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <div className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm whitespace-nowrap">
                          <span className="font-EuclidCircularA text-[10px] md:text-xs text-white/60">
                            {t(`nodes.${key}`)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Subtle glow */}
                <div className="absolute inset-[25%] rounded-full bg-[#2d8a4e]/[0.05] blur-xl" />
              </div>
            </motion.div>

            {/* Features list */}
            <motion.div {...fadeInUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <div className="space-y-4">
                {(t.raw("features") as string[]).map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#2d8a4e] shrink-0" />
                    <span className="text-white/60 text-sm md:text-base leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2d8a4e]/30 bg-[#2d8a4e]/[0.08]">
                <div className="w-2 h-2 rounded-full bg-[#2d8a4e] animate-pulse" />
                <span className="font-IBMPlexMono text-xs text-[#2d8a4e]/80">
                  {t("filing")}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
