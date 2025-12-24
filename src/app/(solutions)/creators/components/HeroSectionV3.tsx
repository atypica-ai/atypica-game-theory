"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface HeroSectionV3Props {
  namespace?: string;
}

export function HeroSectionV3({ namespace = "CreatorPage.HeroSection" }: HeroSectionV3Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations(namespace as any) as any;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGetStarted = () => {
    if (status === "authenticated" && session?.user) {
      router.push("/");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <section className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[720px] overflow-hidden">
      {/* Apple-style minimal background - subtle and sophisticated */}
      <div className="absolute inset-0 z-0 bg-background bg-gradient-to-b from-background via-background to-background/95">
        {/* Very subtle radial gradient accent - brand green hint */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl opacity-[0.25] dark:opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 80%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-screen-2xl relative z-10 h-full">
        <div
          className={cn(
            "flex flex-col justify-center items-center text-center min-h-[560px] md:min-h-[640px] lg:min-h-[720px] py-16 md:py-20",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {/* Eyebrow */}
          <p className="text-base md:text-lg lg:text-xl font-medium tracking-[0.22em] uppercase text-muted-foreground mb-6">
            {t("eyebrow")}
          </p>

          {/* Title */}
          <h1
            className={cn(
              "font-EuclidCircularA font-bold mb-12",
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
              "tracking-tight leading-tight",
              "text-foreground",
            )}
          >
            {t("title")}
          </h1>

          {/* Get Started Button */}
          <Button
            onClick={handleGetStarted}
            size="lg"
            variant="default"
            className={cn(
              "h-12 px-8 text-base font-medium rounded-full",
              "bg-foreground text-background hover:opacity-90",
              "transition-all duration-200",
            )}
          >
            {t("getStarted")}
          </Button>
        </div>
      </div>
    </section>
  );
}
