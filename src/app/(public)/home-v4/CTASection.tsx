"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

const CTA_BG_PROMPT =
  "Cinematic wide shot of a vast horizon at golden hour, a single path leads toward the light, silhouette of distant mountains, dramatic sky with warm amber and deep indigo gradient, landscape photography, inspired by Terrence Malick cinematography, no text, 8k";

export function CTASection() {
  const t = useTranslations("HomePageV4.CTA");

  return (
    <section className="relative py-32 md:py-40 bg-zinc-950 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(CTA_BG_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div className="max-w-3xl mx-auto text-center" {...fadeInUp}>
          <h2
            className={cn(
              "font-EuclidCircularA font-medium tracking-tight text-white",
              "text-4xl md:text-5xl lg:text-6xl",
              "zh:text-3xl zh:md:text-4xl zh:lg:text-5xl zh:tracking-wide",
              "leading-[1.15]",
            )}
          >
            {t("title")}
          </h2>

          <p className="mt-6 text-zinc-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-white text-zinc-950 hover:bg-zinc-200 font-EuclidCircularA font-medium text-base"
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
              className="rounded-full px-8 h-14 text-zinc-400 hover:text-white hover:bg-white/10 font-EuclidCircularA text-base"
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
