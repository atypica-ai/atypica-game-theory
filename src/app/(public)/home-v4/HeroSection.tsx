"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMemo, useRef } from "react";

const HERO_IMAGE_PROMPT =
  "A single massive translucent polyhedron with internal fractures, suspended in vast dark blue-gray void. Inside it, barely visible green particle streams flow slowly like veins. The surface catches cold light — some faces have rough concrete-like texture, others are glass-smooth. Extremely sparse luminous particles drift in the surrounding emptiness. The composition is almost entirely negative space. Cold palette: dark indigo-black background, steel gray and cool white on the form, faint green glow from within. Film grain texture. Vast, silent, contemplative — like discovering an alien artifact in deep space. No people, no text.";

export function HeroSection() {
  const t = useTranslations("HomePageV4.Hero");
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [0, -80]);
  const terminalLines = useMemo(
    () =>
      locale === "zh-CN"
        ? [
            "BOOT:: SUBJECTIVE-WORLD ENGINE READY",
            "SCAN:: behavior traces aligned",
            "LINK:: HippyGhosts persona mesh synced",
            "INSIGHT:: latent intent found",
          ]
        : [
            "BOOT:: SUBJECTIVE-WORLD ENGINE READY",
            "SCAN:: behavior traces aligned",
            "LINK:: HippyGhosts persona mesh synced",
            "INSIGHT:: latent intent found",
          ],
    [locale],
  );

  return (
    <section
      ref={sectionRef}
      className="relative h-screen flex items-end overflow-hidden bg-[#0a0a0c]"
    >
      {/* Background with scroll-driven zoom */}
      <motion.div
        className="absolute inset-0"
        style={{ scale: heroScale, opacity: heroOpacity }}
      >
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(HERO_IMAGE_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-[#0a0a0c]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/70 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.2)_49%,transparent_100%)] bg-[size:100%_4px]" />
      </motion.div>

      {/* Content with scroll-driven drift */}
      <motion.div
        className="relative z-[1] container mx-auto px-4 pb-16 md:pb-24 pt-48 md:pt-64"
        style={{ y: textY, opacity: heroOpacity }}
      >
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2d8a4e]/30 text-[#2d8a4e] text-xs font-EuclidCircularA tracking-wider uppercase backdrop-blur-sm bg-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2d8a4e] animate-pulse" />
              {t("badge")}
            </span>
          </motion.div>

          <motion.h1
            className={cn(
              "mt-6 font-EuclidCircularA font-medium tracking-tight text-white",
              "text-5xl sm:text-6xl md:text-7xl",
              "zh:text-4xl zh:sm:text-5xl zh:md:text-6xl zh:tracking-wide",
              "leading-[1.05]",
            )}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {t("titleLine1")}
            <br />
            <span className="font-InstrumentSerif italic text-[#4ade80]">
              {t("titleLine2")}
            </span>
            {t("titleLine2End")}
          </motion.h1>

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

          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-start gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <Button
              size="lg"
              className="rounded-full px-8 h-12 bg-[#2d8a4e] text-white hover:bg-[#2d8a4e]/80 font-EuclidCircularA font-medium"
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

        <motion.div
          className="mt-10 max-w-xl rounded-xl border border-white/[0.14] bg-black/35 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.1]">
            <span className="font-IBMPlexMono text-[10px] uppercase tracking-[0.18em] text-[#4ade80]">
              Cognitive Terminal
            </span>
            <span className="font-IBMPlexMono text-[10px] text-white/35">LIVE</span>
          </div>
          <div className="px-3 py-2.5 space-y-1.5">
            {terminalLines.map((line, index) => (
              <motion.p
                key={line}
                className="font-IBMPlexMono text-[10px] sm:text-xs text-white/65"
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.24 }}
              >
                <span className="text-[#4ade80] mr-2">{">"}</span>
                {line}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </motion.div>

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
