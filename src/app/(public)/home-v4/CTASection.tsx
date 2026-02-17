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
  "An abstract panoramic horizon where warm light meets deep space. A vast gradient from deep indigo at top through amber and gold to pale cream at the base. Abstract particle clouds drift across the boundary — cosmic dust forming and dissolving in warm light. Scattered geometric fragments — translucent triangles, arcs, broken circles, fine dotted lines — float at various scales, some massive and barely visible, others tiny and bright like distant stars. Expansive, forward-looking, standing at the edge of something vast and new. Retro sci-fi atmosphere — the palette of a 1970s Asimov novel cover. Fine film grain. Style: abstract atmospheric art, wide panoramic. No recognizable objects, no people, no text.";

export function CTASection() {
  const t = useTranslations("HomePageV4.CTA");

  return (
    <section className="relative py-32 md:py-40 overflow-hidden bg-[#0a0a0c]">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(CTA_BG_PROMPT)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/70 to-[#0a0a0c]/50" />
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

          <p className="mt-6 text-white/40 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-[#2d8a4e] text-white hover:bg-[#2d8a4e]/80 font-EuclidCircularA font-medium text-base"
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
              className="rounded-full px-8 h-14 text-white/40 hover:text-white hover:bg-white/10 font-EuclidCircularA text-base"
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
