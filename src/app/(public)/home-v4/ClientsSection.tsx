"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const clients = ["Mars", "Bosch", "Lenovo", "Fonterra", "Ant Group", "Huawei", "L'Oréal", "WPP", "Proya"];

export function ClientsSection() {
  const t = useTranslations("HomePageV4.Clients");

  return (
    <section className="py-20 md:py-24 bg-[#0a0a0c] overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-px bg-[#2d8a4e]/40" />
              <span className="font-IBMPlexMono text-xs text-[#2d8a4e] uppercase tracking-[0.2em]">{t("label")}</span>
              <div className="w-8 h-px bg-[#2d8a4e]/40" />
            </div>
            <h3 className={cn("font-EuclidCircularA font-medium text-white/70", "text-lg md:text-2xl", "zh:text-base zh:md:text-xl")}>{t("title")}</h3>
          </div>

          <div className="relative rounded-2xl border border-white/[0.1] bg-black/20 p-5 md:p-6">
            <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:22px_22px]" />

            <div className="relative flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
              {clients.map((client, index) => (
                <motion.div
                  key={client}
                  className="px-3.5 py-2 rounded-full border border-white/[0.16] bg-white/[0.03]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.18 }}
                >
                  <span className="font-EuclidCircularA text-sm md:text-base text-white/80">{client}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
