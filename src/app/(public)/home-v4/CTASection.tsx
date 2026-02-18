"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

const CTA_BG_PROMPT =
  "Abstract retro-futurist horizon: deep charcoal gradient, distant thin green-white band of light, sparse geometric dust and faint analog scan texture. Calm, hopeful, intelligent atmosphere with strong negative space. No text, no people.";

export function CTASection() {
  const t = useTranslations("HomePageV4.CTA");
  const locale = useLocale();

  const lines = useMemo(
    () =>
      locale === "zh-CN"
        ? ["SESSION READY", "MODEL HUMAN SUBJECTIVITY", "GENERATE ACTIONABLE INSIGHTS"]
        : ["SESSION READY", "MODEL HUMAN SUBJECTIVITY", "GENERATE ACTIONABLE INSIGHTS"],
    [locale],
  );

  return (
    <section className="relative py-24 md:py-32 bg-[#0a0a0c] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(CTA_BG_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/70 to-[#0a0a0c]/55" />
      </div>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.22, 0.5, 0.22] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute left-1/2 top-1/2 h-[260px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4ade80]/[0.06] blur-[110px]" />
      </motion.div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight text-white",
              "text-4xl md:text-5xl lg:text-6xl",
              "zh:text-3xl zh:md:text-4xl zh:lg:text-5xl zh:tracking-wide",
            )}
          >
            {t("title")}
          </h2>
          <p className="mt-5 text-white/55 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">{t("subtitle")}</p>

          <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-sm p-4">
            {lines.map((line, index) => (
              <motion.p
                key={line}
                className="font-IBMPlexMono text-[11px] md:text-xs text-white/65"
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.22 }}
              >
                <span className="text-[#4ade80] mr-2">{">"}</span>
                {line}
              </motion.p>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-[#2d8a4e] text-white hover:bg-[#2d8a4e]/85 font-EuclidCircularA font-medium text-base"
              asChild
            >
              <Link href="/newstudy">
                {t("cta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="rounded-full px-8 h-14 text-white/55 hover:text-white hover:bg-white/10 font-EuclidCircularA text-base"
              asChild
            >
              <Link href="/pricing">{t("secondaryCta")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
