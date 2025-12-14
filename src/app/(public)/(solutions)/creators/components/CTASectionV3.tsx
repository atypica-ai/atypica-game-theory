"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export function CTASectionV3() {
  const t = useTranslations("CreatorPage.CTASection");

  return (
    <section className="py-32 md:py-40 bg-black text-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Headlines - Bold Statement */}
        <div className="mb-20 max-w-5xl">
          <h2 className="font-EuclidCircularA font-bold text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] mb-8">
            {t("headline")}
          </h2>
          <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-green mb-8 leading-tight">
            {t("subheadline")}
          </p>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl">
            {t("tagline")}
          </p>
        </div>

        {/* Main Title */}
        <h3 className="text-3xl md:text-4xl font-bold mb-12 max-w-4xl leading-tight">
          {t("title")}
        </h3>

        {/* Benefits List - Simple and Clean */}
        <div className="mb-16 max-w-4xl">
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-xl md:text-2xl text-white leading-relaxed">
                {t("benefit1")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-xl md:text-2xl text-white leading-relaxed">
                {t("benefit2")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-xl md:text-2xl text-white leading-relaxed">
                {t("benefit3")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-xl md:text-2xl text-white leading-relaxed">
                {t("benefit4")}
              </span>
            </li>
          </ul>
        </div>

        {/* Closing Statement */}
        <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-4xl leading-relaxed">
          {t("closing")}
        </p>

        {/* CTA Button */}
        <div>
          <Button
            size="lg"
            className={cn(
              "rounded-full h-16 px-12 text-lg font-semibold",
              "bg-brand-green hover:brightness-95 text-black",
              "transition-all duration-200 group"
            )}
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              {t("ctaButton")}
              <ChevronRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
