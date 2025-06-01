"use client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { InputSection } from "./InputSection";

export function HeroSection() {
  const t = useTranslations("HomePage.HeroSection");

  return (
    <div className="hero-grid relative min-h-screen flex flex-col items-center justify-center px-6">
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="space-y-4 reveal-up">
          <h1
            className={cn(
              "text-6xl sm:text-7xl lg:text-8xl tracking-tight text-foreground",
              "font-EuclidCircularA block dark:hidden mb-8",
            )}
          >
            atypica.AI
          </h1>
          <div
            className={cn(
              "relative w-[320px] h-[100px] max-w-10/12 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000",
              "hidden dark:block mb-4",
            )}
          >
            <Image
              src="/_public/atypica.ai.green.svg"
              alt="atypica Logo"
              fill
              priority
              className="object-contain dark:block hidden"
            />
          </div>
          <div className="heading-mono text-lg sm:text-xl text-muted-foreground tracking-wide typing-animation">
            {t("subtitle")}
          </div>
        </div>

        {/* Main CTA Description */}
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed reveal-up reveal-delay-1">
          {t("description")}
        </p>

        {/* Primary Input Section */}
        <div className="max-w-2xl mx-auto reveal-up reveal-delay-2">
          <InputSection />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 max-w-lg mx-auto reveal-up reveal-delay-3">
          <div className="text-center p-4">
            <div className="text-2xl font-bold heading-mono text-foreground">10K+</div>
            <div className="text-sm text-muted-foreground">{t("stats.personas")}</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold heading-mono text-foreground">50K+</div>
            <div className="text-sm text-muted-foreground">{t("stats.interviews")}</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold heading-mono text-foreground">500+</div>
            <div className="text-sm text-muted-foreground">{t("stats.businesses")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
