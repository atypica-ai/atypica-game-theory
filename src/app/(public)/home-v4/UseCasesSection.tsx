"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, ArrowUpRight } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

const enterpriseCases = ["productTest", "pricing", "brand", "content", "journey"] as const;
const creatorCases = ["persona", "resonance", "community"] as const;

export function UseCasesSection() {
  const t = useTranslations("HomePageV4.UseCases");
  const [activeTab, setActiveTab] = useState<"enterprise" | "creator">("enterprise");

  return (
    <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div className="max-w-3xl mx-auto text-center mb-12 md:mb-16" {...fadeInUp}>
          <p className="text-sm font-EuclidCircularA text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            {t("label")}
          </p>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight",
              "text-3xl md:text-4xl lg:text-5xl",
              "zh:text-2xl zh:md:text-3xl zh:lg:text-4xl zh:tracking-wide",
              "text-zinc-950 dark:text-white",
            )}
          >
            {t("title")}
          </h2>
        </motion.div>

        {/* Tab switcher */}
        <motion.div className="flex justify-center mb-12" {...fadeInUp} transition={{ duration: 0.6, delay: 0.1 }}>
          <div className="inline-flex items-center p-1 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
            <button
              onClick={() => setActiveTab("enterprise")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-EuclidCircularA transition-all duration-200",
                activeTab === "enterprise"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              <Building2 className="size-4" />
              {t("tabs.enterprise")}
            </button>
            <button
              onClick={() => setActiveTab("creator")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-EuclidCircularA transition-all duration-200",
                activeTab === "creator"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              <User className="size-4" />
              {t("tabs.creator")}
            </button>
          </div>
        </motion.div>

        {/* Cases grid */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "enterprise" ? (
              <motion.div
                key="enterprise"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {enterpriseCases.map((key) => (
                  <div
                    key={key}
                    className={cn(
                      "group p-6 md:p-7 rounded-2xl",
                      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                      "transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700",
                      "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50",
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-EuclidCircularA font-medium text-base text-zinc-950 dark:text-white">
                        {t(`enterprise.${key}.title`)}
                      </h4>
                      <ArrowUpRight className="size-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {t(`enterprise.${key}.description`)}
                    </p>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="creator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {creatorCases.map((key) => (
                  <div
                    key={key}
                    className={cn(
                      "group p-6 md:p-7 rounded-2xl",
                      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                      "transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700",
                      "hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50",
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-EuclidCircularA font-medium text-base text-zinc-950 dark:text-white">
                        {t(`creator.${key}.title`)}
                      </h4>
                      <ArrowUpRight className="size-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {t(`creator.${key}.description`)}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
