"use client";
import { getS3CDNUrl } from "@/app/(public)/home-v3/actions";
import { HeroVideo } from "@/app/(public)/home-v3/HeroVideo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function InterviewProjectHomePageClient() {
  const t = useTranslations("InterviewProject.homepage");
  const [videoSrc, setVideoSrc] = useState<string | undefined>();

  useEffect(() => {
    getS3CDNUrl("atypica/public/atypica-promo-ai-interview-20250921.mp4").then((res) => {
      setVideoSrc(res);
    });
  }, []);

  const features = [
    {
      id: "human",
      title: t("humanInterviewsTitle"),
      description: t("humanInterviewsDescription"),
    },
    {
      id: "agent",
      title: t("aiInterviewsTitle"),
      description: t("aiInterviewsDescription"),
    },
    {
      id: "analytics",
      title: t("analyticsTitle"),
      description: t("analyticsDescription"),
    },
  ];

  const steps = [
    {
      id: "step1",
      title: t("step1Title"),
      description: t("step1Description"),
    },
    {
      id: "step2",
      title: t("step2Title"),
      description: t("step2Description"),
    },
    {
      id: "step3",
      title: t("step3Title"),
      description: t("step3Description"),
    },
    {
      id: "step4",
      title: t("step4Title"),
      description: t("step4Description"),
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="py-24 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-mono text-sm font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              Interview Platform
            </h1>
            <h2 className="font-sans text-4xl md:text-7xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t("subtitle")}
          </p>
          <div className="pt-4">
            <Button size="lg" variant="default" asChild>
              <Link href="/interview/projects" prefetch={true}>
                {t("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Video Section */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="aspect-video rounded-xl shadow-2xl shadow-black/10 overflow-hidden">
            <HeroVideo src={videoSrc} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-200 dark:border-zinc-800">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className={cn(
                  "p-6 md:p-12 border-zinc-200 dark:border-zinc-800",
                  index < features.length - 1 && "md:border-r",
                  index < features.length - 1 && "border-b md:border-b-0",
                )}
              >
                <div className="space-y-4">
                  <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("howItWorksTitle")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400">
                {t("howItWorksSubtitle")}
              </p>
            </div>

            <div className="relative">
              {/* Center line */}
              <div
                className="absolute left-1/2 top-10 bottom-10 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block"
                aria-hidden="true"
              ></div>

              <div className="space-y-12 md:space-y-16">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="relative flex items-start md:items-center md:odd:flex-row-reverse group"
                  >
                    <div
                      className={cn(
                        "w-full md:w-1/2 pl-12 md:pl-0",
                        "md:group-odd:text-left md:group-odd:pl-16 md:group-even:text-right md:group-even:pr-16",
                      )}
                    >
                      <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    <div className="absolute left-0 top-0 md:left-1/2 md:-translate-x-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-mono font-medium text-xs md:text-sm border-2 md:border-4 border-zinc-50 dark:border-zinc-950">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("ctaTitle")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t("ctaDescription")}
              </p>
            </div>
            <Button size="lg" variant="default" asChild>
              <Link href="/interview/projects" prefetch={true}>
                {t("createFirstProject")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
