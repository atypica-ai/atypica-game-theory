"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

const advancedWorkflowPrompt = `
  Futuristic workflow map UI for advanced creators on a dark grid.
  Three stages in a horizontal timeline, each panel with glowing red, blue, and yellow accents.
  Minimalist charts, arrows, and blocks, sci-fi game HUD style.
  No characters, only UI elements.
`;

export function AdvancedWorkflowSectionV3() {
  const t = useTranslations("CreatorsPage.AdvancedWorkflowSection");

  return (
    <section className="bg-white dark:bg-zinc-900 py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Section Label */}
        <p className="text-sm font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title */}
        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-6 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-3xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Futuristic workflow illustration */}
        <div className="mb-20">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="relative aspect-video">
              <Image
                src={`/api/imagegen/dev/${encodeURIComponent(advancedWorkflowPrompt)}?ratio=landscape`}
                alt="Advanced creator workflow map"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 70vw"
              />
            </div>
          </div>
        </div>

        {/* Workflows */}
        <div className="space-y-20">
          {/* Workflow 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-2">
              <span
                className="text-6xl font-bold text-red-500"
                style={{
                  textShadow: "0 0 20px rgba(248,113,113,0.6)",
                  filter: "drop-shadow(0 0 10px rgba(248,113,113,0.6))",
                }}
              >
                01
              </span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("workflow1.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-400 mb-6 leading-relaxed">
                {t("workflow1.description")}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow1.actions.action1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow1.actions.action2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow1.actions.action3")}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Workflow 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-zinc-200 dark:border-zinc-800 pt-20">
            <div className="lg:col-span-2">
              <span
                className="text-6xl font-bold text-blue-400"
                style={{
                  textShadow: "0 0 20px rgba(59,130,246,0.6)",
                  filter: "drop-shadow(0 0 10px rgba(59,130,246,0.6))",
                }}
              >
                02
              </span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("workflow2.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-400 mb-6 leading-relaxed">
                {t("workflow2.description")}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow2.actions.action1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow2.actions.action2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow2.actions.action3")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow2.actions.action4")}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Workflow 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-zinc-200 dark:border-zinc-800 pt-20">
            <div className="lg:col-span-2">
              <span
                className="text-6xl font-bold text-amber-400"
                style={{
                  textShadow: "0 0 20px rgba(250,204,21,0.8)",
                  filter: "drop-shadow(0 0 10px rgba(250,204,21,0.8))",
                }}
              >
                03
              </span>
            </div>
            <div className="lg:col-span-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                {t("workflow3.title")}
              </h3>
              <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-400 mb-6 leading-relaxed">
                {t("workflow3.description")}
              </p>

              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                {t("workflow3.beforeLaunching")}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-amber-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow3.actions.action1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow3.actions.action2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-amber-300 font-semibold">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {t("workflow3.actions.action3")}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
