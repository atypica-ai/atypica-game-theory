"use client";

import { useTranslations } from "next-intl";

export function AskAudienceSectionV3() {
  const t = useTranslations("CreatorPage.AskAudienceSection");

  return (
    <section className="py-32 md:py-40 bg-white dark:bg-zinc-950">
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
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-4xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Value Proposition */}
        <p className="text-2xl md:text-3xl font-semibold mb-20 max-w-3xl text-zinc-900 dark:text-white leading-tight">
          {t("value")}
        </p>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-20">
          {/* Left: Use Cases */}
          <div>
            <h3 className="text-xl font-bold mb-8 text-zinc-900 dark:text-white">
              {t("useCases.title")}
            </h3>

            <div className="space-y-6">
              <div className="border-l-2 border-brand-green pl-6">
                <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {t("useCases.case1")}
                </p>
              </div>
              <div className="border-l-2 border-brand-green pl-6">
                <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {t("useCases.case2")}
                </p>
              </div>
              <div className="border-l-2 border-brand-green pl-6">
                <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {t("useCases.case3")}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Applications */}
          <div>
            <h3 className="text-xl font-bold mb-8 text-zinc-900 dark:text-white">
              {t("applications.title")}
            </h3>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                <span className="text-base text-zinc-700 dark:text-zinc-300">{t("applications.app1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                <span className="text-base text-zinc-700 dark:text-zinc-300">{t("applications.app2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                <span className="text-base text-zinc-700 dark:text-zinc-300">{t("applications.app3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                <span className="text-base text-zinc-700 dark:text-zinc-300">{t("applications.app4")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Benefit Statement */}
        <div className="max-w-4xl mb-20">
          <p className="text-lg md:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-4 border-brand-green pl-8">
            {t("benefit")}
          </p>
        </div>

        {/* Real Example */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <p className="text-sm font-semibold tracking-wider uppercase text-brand-green mb-6">
            {t("realExample.title")}
          </p>

          <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed max-w-4xl">
            {t("realExample.description")}
          </p>

          <div className="pt-6">
            <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
              Result
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {t("realExample.result")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
