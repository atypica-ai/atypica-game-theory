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

export function ClientsSection() {
  const t = useTranslations("HomePageV4.Clients");

  return (
    <section className="py-20 md:py-24 border-t border-zinc-200 overflow-hidden">
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
                "font-EuclidCircularA font-medium text-lg md:text-xl text-zinc-500",
                "zh:text-base zh:md:text-lg",
              )}
            >
              {t("title")}
            </h3>
          </motion.div>
        </div>
      </div>

      {/* Marquee scrolling strip */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#fafaf8] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#fafaf8] to-transparent z-10" />

        <motion.div
          className="flex items-center gap-16 md:gap-24 whitespace-nowrap"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Duplicate for seamless scroll */}
          <motion.div
            className="flex items-center gap-16 md:gap-24 shrink-0"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...clients, ...clients].map((client, i) => (
              <span
                key={`${client}-${i}`}
                className={cn(
                  "font-EuclidCircularA text-lg md:text-2xl font-medium",
                  "text-zinc-200 transition-colors duration-300",
                  "hover:text-zinc-400",
                  "select-none",
                )}
              >
                {client}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
