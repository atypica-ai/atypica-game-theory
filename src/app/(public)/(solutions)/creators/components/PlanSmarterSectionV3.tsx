"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

// Content planning infographic prompt
const planningPrompt = `
Bold infographic: "PLAN SMARTER" content strategy system.
Show: Large "30 DAYS" headline, visual content calendar grid with colorful topic clusters, "3 AUDIENCE SEGMENTS" with icons, "5X ENGAGEMENT" metric callout.
Information: Display planning workflow with numbered steps (1→2→3), data points, progress indicators.
Colors: Vibrant purple and electric blue blocks with white text. High contrast geometric sections.
Style: Modern infographic - bold typography, data visualization, clean icons. Social media ready.
Mood: Energetic, strategic, empowering for creators.
`;

export function PlanSmarterSectionV3() {
  const t = useTranslations("CreatorPage.PlanSmarterSection");

  return (
    <section className="py-32 md:py-40 bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Label */}
        <p className="text-sm font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title */}
        <h2 className="font-EuclidCircularA font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mb-6 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-20 max-w-4xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Use Cases */}
        <div className="space-y-20 mb-32">
          {/* Use Case 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-2">
              <span className="text-6xl font-bold text-brand-green">01</span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("useCase1.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                {t("useCase1.description")}
              </p>

              {/* Planning illustration */}
              <div className="relative w-full aspect-video mb-8 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <Image
                  loader={({ src }) => src}
                  src={`/api/imagegen/dev/${encodeURIComponent(planningPrompt)}?ratio=landscape`}
                  alt="Content planning workspace"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
                  &ldquo;{t("useCase1.example1")}&rdquo;
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
                  &ldquo;{t("useCase1.example2")}&rdquo;
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-semibold tracking-wider uppercase text-brand-green mb-2">
                  Output
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{t("useCase1.output")}</p>
              </div>
            </div>
          </div>

          {/* Use Case 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-2">
              <span className="text-6xl font-bold text-brand-green">02</span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("useCase2.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                {t("useCase2.description")}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("useCase2.point1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("useCase2.point2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("useCase2.point3")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("useCase2.point4")}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Use Case 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-2">
              <span className="text-6xl font-bold text-brand-green">03</span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("useCase3.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                {t("useCase3.description")}
              </p>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
                  &ldquo;{t("useCase3.example1")}&rdquo;
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">
                  &ldquo;{t("useCase3.example2")}&rdquo;
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-semibold tracking-wider uppercase text-brand-green mb-2">
                  Output
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{t("useCase3.output")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example - clean professional layout */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold tracking-wider uppercase text-brand-green mb-6">
                {t("realExample.title")}
              </p>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
                    Persona
                  </p>
                  <p className="text-lg font-medium text-zinc-900 dark:text-white">
                    {t("realExample.persona")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
                    Situation
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("realExample.situation")}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-4">
                Solution
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-6">
                {t("realExample.solution")}
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output3")}
                  </span>
                </li>
              </ul>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                  {t("realExample.result")}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-green hover:underline"
                >
                  {t("realExample.linkText")} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
