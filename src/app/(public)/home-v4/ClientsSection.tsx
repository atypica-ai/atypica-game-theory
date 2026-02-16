"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const clients = [
  "Unilever",
  "L'Oréal",
  "PDD",
  "Meituan",
  "Bilibili",
  "Didi",
  "Trip.com",
  "NIO",
  "Zeekr",
  "360",
];

export function ClientsSection() {
  const t = useTranslations("HomePageV4.Clients");

  return (
    <section className="py-20 md:py-24 border-t border-white/[0.06] overflow-hidden">
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
              <div className="w-8 h-px bg-[#00ff00]/30" />
              <span className="font-IBMPlexMono text-xs text-[#00ff00] uppercase tracking-[0.2em]">
                {t("label")}
              </span>
              <div className="w-8 h-px bg-[#00ff00]/30" />
            </div>
            <h3
              className={cn(
                "font-EuclidCircularA font-medium text-lg md:text-xl text-white/70",
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
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0c] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0c] to-transparent z-10" />

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
                  "text-white/10 transition-colors duration-300",
                  "hover:text-white/40",
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
