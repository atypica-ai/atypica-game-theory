"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface HeroSectionV3Props {
  namespace?: string;
}

export function HeroSectionV3({ namespace = "CreatorPages.HeroSection" }: HeroSectionV3Props) {
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
            background:
              "radial-gradient(ellipse at center, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 80%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl relative z-10 h-full">
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

          {/* Title with green accent based on title content */}
          <h1
            className={cn(
              "font-EuclidCircularA font-bold mb-6",
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
              "tracking-tight leading-[1.3]",
              "text-foreground",
            )}
          >
            {(() => {
              const title = t("title");
              // Emphasize keywords with extra bold and green accent (larger dots, or green i-dot)
              // Support both EN and ZH titles
              if (title.includes("让趋势") || title.includes("Turn Trends viral")) {
                // Creators: extra bold "让" or "Turn", add larger green dot before
                if (title.includes("让趋势")) {
                  return (
                    <>
                      <span className="relative inline-block ml-6">
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                        <span className="font-black text-[1.1em]">让</span>
                      </span>
                      趋势在几天内爆火
                    </>
                  );
                }
                return (
                  <>
                    <span className="relative inline-block ml-6">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                      <span className="font-black text-[1.1em]">Turn</span>
                    </span>{" "}
                    Trends viral, In Days
                  </>
                );
              } else if (title.includes("将信任") || title.includes("Monetize Trust")) {
                // Influencers: extra bold "将" or "Monetize", use green i-dot for "i" in "Monetize"
                if (title.includes("将信任")) {
                  return (
                    <>
                      <span className="relative inline-block ml-6">
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                        <span className="font-black text-[1.1em]">将</span>
                      </span>
                      信任变现
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.1em]">
                      Monet<span className="text-primary">i</span>ze
                    </span>{" "}
                    Trust
                  </>
                );
              } else if (title.includes("真实声音") || title.includes("Real voices")) {
                // Marketers: extra bold keywords, add green dots
                if (title.includes("真实声音")) {
                  return (
                    <>
                      <span className="font-black text-[1.1em]">真实</span>声音，
                      <span className="font-black text-[1.1em]">真实</span>转化
                    </>
                  );
                }
                return (
                  <>
                    Real{" "}
                    <span className="relative inline-block ml-6">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                      <span className="font-black text-[1.1em]">voices</span>
                    </span>
                    , real{" "}
                    <span className="relative inline-block ml-6">
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                      <span className="font-black text-[1.1em]">conversions</span>
                    </span>
                  </>
                );
              } else if (title.includes("创新") || title.includes("Innovation")) {
                // Product Managers: extra bold "去风险化" or "De-Risked", use green i-dot
                if (title.includes("创新，去风险化")) {
                  return (
                    <>
                      创新，
                      <span className="relative inline-block ml-6">
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                        <span className="font-black text-[1.1em]">去风险化</span>
                      </span>
                    </>
                  );
                }
                return (
                  <>
                    Innovation,{" "}
                    <span className="font-black text-[1.1em]">
                      De-R<span className="text-primary">i</span>sked
                    </span>
                  </>
                );
              } else if (title.includes("尽早淘汰") || title.includes("Kill Bad Ideas")) {
                // Startup Owners: extra bold "尽早" or "Kill", strikethrough on "坏想法" or "Bad Ideas"
                if (title.includes("尽早淘汰")) {
                  return (
                    <>
                      <span className="relative inline-block ml-6">
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                        <span className="font-black text-[1.1em]">尽早</span>
                      </span>
                      淘汰
                      <span className="line-through decoration-primary decoration-[3px]">
                        坏想法
                      </span>
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.1em]">
                      K<span className="text-primary">i</span>ll
                    </span>{" "}
                    <span className="line-through decoration-primary decoration-[3px]">
                      Bad Ideas
                    </span>{" "}
                    Early
                  </>
                );
              } else if (title.includes("展示消费者") || title.includes("Show consumer proof")) {
                // Consultants: extra bold "展示" or "Show", use green i-dot
                if (title.includes("展示消费者")) {
                  return (
                    <>
                      <span className="relative inline-block ml-6">
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"></span>
                        <span className="font-black text-[1.1em]">展示</span>
                      </span>
                      消费者证据，而非幻灯片
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.1em]">
                      Sh<span className="text-primary">o</span>w
                    </span>{" "}
                    consumer proof, more than slides
                  </>
                );
              }
              return title;
            })()}
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
