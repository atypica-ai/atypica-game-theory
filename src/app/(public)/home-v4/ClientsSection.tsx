"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const clients = [
  "Mars",
  "Bosch",
  "Lenovo",
  "Fonterra",
  "Ant Group",
  "Huawei",
  "L'Oréal",
  "WPP",
  "Proya",
];

const rows = [
  {
    speed: 25,
    reverse: false,
    opacity: "text-white/[0.12]",
    size: "text-lg md:text-2xl",
  },
  {
    speed: 35,
    reverse: true,
    opacity: "text-white/[0.08]",
    size: "text-base md:text-xl",
  },
  {
    speed: 30,
    reverse: false,
    opacity: "text-white/[0.05]",
    size: "text-sm md:text-lg",
  },
];

export function ClientsSection() {
  const t = useTranslations("HomePageV4.Clients");

  return (
    <section className="py-20 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#2d8a4e]/40" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#2d8a4e]/40" />
            </div>
            <h3
              className={cn(
                "font-EuclidCircularA font-medium text-lg md:text-xl text-white/40",
                "zh:text-base zh:md:text-lg",
              )}
            >
              {t("title")}
            </h3>
          </motion.div>
        </div>
      </div>

      {/* Multi-layer marquee */}
      <div className="relative space-y-4">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0c] to-transparent z-[1]" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0c] to-transparent z-[1]" />

        {rows.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            className="flex items-center overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 * rowIndex }}
          >
            <motion.div
              className="flex items-center gap-12 md:gap-20 shrink-0"
              animate={{
                x: row.reverse ? ["-50%", "0%"] : ["0%", "-50%"],
              }}
              transition={{
                duration: row.speed,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {[...clients, ...clients, ...clients, ...clients].map(
                (client, i) => (
                  <span
                    key={`${client}-${rowIndex}-${i}`}
                    className={cn(
                      "font-EuclidCircularA font-medium whitespace-nowrap select-none",
                      "transition-colors duration-300",
                      "hover:text-white/30",
                      row.opacity,
                      row.size,
                    )}
                  >
                    {client}
                  </span>
                ),
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
