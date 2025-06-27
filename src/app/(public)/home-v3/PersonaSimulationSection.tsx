"use client";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function PersonaSimulationSection() {
  const t = useTranslations("HomePageV3.PersonaSimulationSection");
  return (
    <section className="bg-zinc-50 dark:bg-zinc-900 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            {t("badge")}
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            {t("description")}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-6">
          {/* Technology Overview - Spans 2 columns */}
          <div className="md:col-span-2 bg-zinc-700 dark:bg-zinc-800 text-white rounded-2xl p-8 flex flex-col">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider opacity-60 mb-4">
                Technology Deep Dive
              </p>
              <blockquote className="text-lg md:text-xl leading-relaxed mb-6">
                &ldquo;{t("technologyQuote")}&rdquo;
              </blockquote>
              <p className="text-sm opacity-80 mb-6">{t("technologyDescription")}</p>
            </div>
            <div className="mt-auto">
              <Link
                href="/persona-simulation"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
              >
                {t("learnMoreLink")}
                <ChevronRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-yellow-300 text-zinc-900 rounded-2xl p-8 flex flex-col justify-center text-center">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">{t("accuracyLabel")}</p>
            <div className="text-6xl md:text-7xl font-bold mb-2">85%</div>
            <p className="text-lg">{t("accuracyDescription")}</p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-16">
          {/* What Makes Them Different */}
          <div className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl p-8">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">Core Differentiator</p>
            <h3 className="text-xl font-semibold mb-4">{t("differentiatorTitle")}</h3>
            <p className="text-sm opacity-80 mb-6">{t("differentiatorDescription")}</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">{t("differentiatorFeatures.consistency")}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">{t("differentiatorFeatures.authenticity")}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">{t("differentiatorFeatures.realism")}</span>
              </div>
            </div>
          </div>

          {/* Agent Ecosystem */}
          <div className="bg-zinc-900 dark:bg-zinc-600 text-white rounded-2xl p-8">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">Agent Ecosystem</p>
            <h3 className="text-xl font-semibold mb-4">{t("ecosystemTitle")}</h3>
            <div className="space-y-4">
              <div className="bg-blue-900/30 p-3 rounded">
                <div className="text-blue-400 font-semibold">
                  {t("ecosystemFeatures.syntheticAgents.title")}
                </div>
                <div className="text-xs opacity-80">
                  {t("ecosystemFeatures.syntheticAgents.description")}
                </div>
              </div>
              <div className="bg-green-900/30 p-3 rounded">
                <div className="text-green-400 font-semibold">
                  {t("ecosystemFeatures.realPersonAgents.title")}
                </div>
                <div className="text-xs opacity-80">
                  {t("ecosystemFeatures.realPersonAgents.description")}
                </div>
              </div>
              <div className="bg-purple-900/30 p-3 rounded">
                <div className="text-purple-400 font-semibold">
                  {t("ecosystemFeatures.multiDimensional.title")}
                </div>
                <div className="text-xs opacity-80">
                  {t("ecosystemFeatures.multiDimensional.description")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-3xl mx-auto mb-8">
            <h3 className="text-2xl font-EuclidCircularA font-medium mb-4">{t("ctaTitle")}</h3>
            <p className="text-zinc-600 dark:text-zinc-400">{t("ctaDescription")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
              <Link href="/study">
                {t("startResearchButton")}
                <ChevronRightIcon className="h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full h-12 px-8" asChild>
              <Link href="/persona-simulation">{t("learnTechnologyButton")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
