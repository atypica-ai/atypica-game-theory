"use client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { InputSection } from "./InputSection";

export function HeroSection() {
  const tRoot = useTranslations();
  const t = useTranslations("HomePage.HeroSection");

  return (
    <div className="hero-grid relative px-4 py-12 sm:py-40">
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="reveal-up mb-16">
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
              "relative w-[300px] h-[100px] sm:w-[480px] sm:h-[160px] max-w-10/12 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000",
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
          {/* <div className="font-mono text-lg text-muted-foreground tracking-wide typing-animation">
            {t("subtitle")}
          </div> */}
          <div className="text-base sm:text-xl font-light text-muted-foreground">
            {tRoot("tagline")}
          </div>
        </div>

        {/* Primary Input Section */}
        <div className="max-w-2xl mx-auto reveal-up reveal-delay-1">
          <InputSection />
        </div>

        {/* Quick Stats */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 max-w-lg mx-auto reveal-up reveal-delay-3">
          <div className="text-center p-4">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">50K+</div>
            <div className="text-sm text-muted-foreground">{t("stats.personas")}</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">100K+</div>
            <div className="text-sm text-muted-foreground">{t("stats.interviews")}</div>
          </div>
        </div> */}

        {/* Trusted Users Banner */}
        {/* <div className="pt-4 max-w-2xl mx-auto text-center reveal-up reveal-delay-4">
          <div className="text-sm text-muted-foreground">{t("stats.trustedUsers")}</div>
        </div> */}
      </div>
    </div>
  );
}
