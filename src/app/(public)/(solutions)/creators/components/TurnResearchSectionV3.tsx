"use client";

import { useTranslations } from "next-intl";

export function TurnResearchSectionV3() {
  const t = useTranslations("CreatorPage.TurnResearchSection");

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

        {/* Outputs */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("outputs.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <span className="text-4xl">📝</span>
              <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("outputs.output1")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-4xl">🎙️</span>
              <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("outputs.output2")}
              </p>
            </div>
          </div>
        </div>

        {/* Ideal For */}
        <div className="mb-20">
          <h3 className="text-xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("idealFor.title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{t("idealFor.type1")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{t("idealFor.type2")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{t("idealFor.type3")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{t("idealFor.type4")}</span>
            </div>
          </div>
        </div>

        {/* Reuse Options */}
        <div className="mb-20 border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <h3 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("reuseOptions.title")}
          </h3>
          <ul className="space-y-4 max-w-4xl">
            <li className="flex items-start gap-3">
              <span className="text-brand-green font-semibold text-lg">→</span>
              <span className="text-base text-zinc-700 dark:text-zinc-300">{t("reuseOptions.option1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-green font-semibold text-lg">→</span>
              <span className="text-base text-zinc-700 dark:text-zinc-300">{t("reuseOptions.option2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-green font-semibold text-lg">→</span>
              <span className="text-base text-zinc-700 dark:text-zinc-300">{t("reuseOptions.option3")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-green font-semibold text-lg">→</span>
              <span className="text-base text-zinc-700 dark:text-zinc-300">{t("reuseOptions.option4")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-green font-semibold text-lg">→</span>
              <span className="text-base text-zinc-700 dark:text-zinc-300">{t("reuseOptions.option5")}</span>
            </li>
          </ul>
        </div>

        {/* Formula - Bold Statement */}
        <div className="mb-32 text-center py-16 border-y border-zinc-200 dark:border-zinc-800">
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white leading-tight">
            {t("formula")}
          </p>
        </div>

        {/* Real Examples */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">
            {t("realExamples.title")}
          </h3>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-12 max-w-4xl">
            {t("realExamples.description")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example1")}
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example2")}
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example3")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
