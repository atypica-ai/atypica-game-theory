"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const HERO_IMAGE_PROMPT =
  "Abstract architectural interior with converging corridors and warm amber light streaming through geometric openings, deep shadows, minimalist concrete surfaces, ethereal atmosphere, no people, cinematic wide angle, inspired by Tadao Ando architecture, 8k";

export function HeroSection() {
  const t = useTranslations("HomePageV4.Hero");

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-end overflow-hidden">
      {/* Hero background image */}
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(HERO_IMAGE_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/70 to-[#0a0a0c]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pb-16 md:pb-24 pt-48 md:pt-64">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff00]/20 text-[#00ff00]/80 text-xs font-EuclidCircularA tracking-wider uppercase backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse" />
              {t("badge")}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className={cn(
              "mt-6 font-EuclidCircularA font-medium tracking-tight text-white",
              "text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
              "zh:text-4xl zh:sm:text-5xl zh:md:text-6xl zh:lg:text-7xl zh:tracking-wide",
              "leading-[1.05]",
            )}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {t("titleLine1")}
            <br />
            <span className="font-InstrumentSerif italic text-[#00ff00]">
              {t("titleLine2")}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className={cn(
              "mt-6 text-white/50 max-w-xl",
              "text-base md:text-lg leading-relaxed",
              "zh:text-sm zh:md:text-base",
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {t("subtitle")}
          </motion.p>

          {/* CTA */}
          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-start gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <Button
              size="lg"
              className="rounded-full px-8 h-12 bg-[#00ff00] text-black hover:bg-[#00ff00]/80 font-EuclidCircularA font-medium"
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
              className="rounded-full px-8 h-12 text-white/50 hover:text-white hover:bg-white/10 font-EuclidCircularA"
              asChild
            >
              <Link href="/pricing">{t("secondaryCta")}</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 right-8 hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <span className="text-white/30 text-xs font-EuclidCircularA tracking-widest uppercase [writing-mode:vertical-lr]">
            Scroll
          </span>
          <ChevronDown className="size-4 text-white/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}
