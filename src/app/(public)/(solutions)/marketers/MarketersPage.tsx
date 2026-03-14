"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroTitle } from "../components/HeroTitle";
import { ScenarioCard } from "../components/ScenarioCard";

export default function MarketersPage() {
  const locale = useLocale();
  const t = useTranslations("Solutions.MarketersPage");
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

  const isZh = locale === "zh-CN";

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[720px] overflow-hidden px-4 sm:px-8">
        <div className="mx-auto max-w-6xl relative h-full">
          <div
            className={cn(
              "flex flex-col justify-center items-center text-center min-h-[560px] md:min-h-[640px] lg:min-h-[720px] py-16 md:py-20",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
          >
            <p className="text-sm md:text-xl font-medium tracking-[0.22em] uppercase text-muted-foreground mb-6">
              Atypica For Marketers
            </p>

            <HeroTitle>
              <span className="font-EuclidCircularA font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-tight leading-[1.3]">
                {isZh ? (
                  <>
                    <span className="font-bold">真实</span>声音，
                    <span className="font-bold">真实</span>转化
                  </>
                ) : (
                  <>
                    <span className="font-bold">Real</span> voices,{" "}
                    <span className="font-bold">real</span> conversions
                  </>
                )}
              </span>
            </HeroTitle>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-10">
              {isZh
                ? "快速知道什么会火、怎么优化、趋势在哪"
                : "Quickly discover what will go viral, how to optimize, and where trends are heading"}
            </p>

            <Button
              size="lg"
              onClick={handleGetStarted}
              className="h-12 sm:h-14 sm:px-10 text-base font-semibold rounded-full"
            >
              {isZh ? "开始使用" : "Get Started"}
            </Button>
          </div>
        </div>
      </section>

      <CaseStudiesSection tag="marketers" title={t("CaseStudiesSection.title")} />

      {/* Use Cases Section */}
      <section className="py-20 md:py-32 relative overflow-hidden px-4 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground text-center mb-12">
            {t("UseCasesSection.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mx-auto">
            <ScenarioCard
              question={t("UseCasesSection.scenario1.question")}
              toolLabel={t("UseCasesSection.scenario1.primaryTool.label")}
              href={`/newstudy?brief=${encodeURIComponent(t("UseCasesSection.scenario1.question"))}`}
            />
            <ScenarioCard
              question={t("UseCasesSection.scenario2.question")}
              toolLabel={t("UseCasesSection.scenario2.primaryTool.label")}
              href="/persona"
            />
            <ScenarioCard
              question={t("UseCasesSection.scenario3.question")}
              toolLabel={t("UseCasesSection.scenario3.primaryTool.label")}
              href={`/sage`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
