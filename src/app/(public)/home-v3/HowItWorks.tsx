"use client";
import { cn } from "@/lib/utils";
import { BrainIcon, MessageCircleIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

const processSteps = [
  {
    step: "01",
    id: "personaGeneration",
    icon: SparklesIcon,
    colorClasses: "bg-sky-50 dark:bg-sky-900/30 border-sky-100 dark:border-sky-900",
    iconColorClasses: "text-sky-600 dark:text-sky-400",
    text2ImagePrompt:
      "A sky blue 'Generate AI Personas' button with sparkle icon on warm cream background. Frosted glass effect with subtle transparency and blur.",
    // text2ImagePrompt: "A muted sky blue 'Create Personas' button with sparkle icon on warm cream background. Frosted matte glass effect with subtle transparency and diffused blur.",
  },
  {
    step: "02",
    id: "aiInterviews",
    icon: MessageCircleIcon,
    colorClasses: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900",
    iconColorClasses: "text-emerald-600 dark:text-emerald-400",
    text2ImagePrompt:
      "An emerald green 'Start Interview' button with microphone icon and simple chat bubbles on warm cream background. Frosted glass effect with subtle transparency and blur.",
    // text2ImagePrompt: "An emerald green 'Start Interview' button with microphone icon on warm cream background. Frosted matte glass effect with subtle transparency and diffused blur.",
  },
  {
    step: "03",
    id: "behaviorAnalysis",
    icon: BrainIcon,
    colorClasses: "bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-900",
    iconColorClasses: "text-violet-600 dark:text-violet-400",
    text2ImagePrompt:
      "A violet 'Analyze Behavior' button with brain icon and simple insight cards on warm cream background. Frosted glass effect with subtle transparency and blur.",
    // text2ImagePrompt: "A violet 'Analyze Behavior' button with brain icon and simple insight cards on warm cream background. Frosted matte glass effect with subtle transparency and diffused blur.",
  },
  {
    step: "04",
    id: "instantInsights",
    icon: TrendingUpIcon,
    colorClasses: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900",
    iconColorClasses: "text-amber-600 dark:text-amber-400",
    text2ImagePrompt:
      "An amber 'Download Report' button with download icon and report preview card on warm cream background. Frosted glass effect with subtle transparency and blur.",
    // text2ImagePrompt: "A muted amber 'Download Report' button with download icon and report preview card on warm cream background. Frosted matte glass effect with subtle transparency and diffused blur.",
  },
];

export function HowItWorks() {
  const t = useTranslations("HomePageV3.HowItWorks");
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            {t("badge")}
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {processSteps.map((step) => (
            <div
              key={step.step}
              className={cn(
                "rounded-3xl transition-all duration-300 hover:-translate-y-1 border overflow-hidden",
                step.colorClasses,
                "flex flex-col max-md:flex-row",
              )}
            >
              <div
                className={cn(
                  "bg-white/50 dark:bg-zinc-950/50 relative",
                  "w-full h-auto aspect-4/3 max-md:w-auto max-md:h-40 max-md:aspect-square",
                )}
              >
                <Image
                  src={`/api/imagegen/dev/${step.text2ImagePrompt}`}
                  alt={step.text2ImagePrompt}
                  className="object-cover dark:opacity-90"
                  sizes="600px"
                  fill
                />
              </div>
              <div className="p-8 max-md:py-3 max-md:px-4 flex flex-col grow">
                <div className="flex justify-between items-start mb-6 max-md:mb-2">
                  <span className="text-5xl max-md:text-xl font-bold text-zinc-300 dark:text-zinc-700">
                    {step.step}
                  </span>
                  <div
                    className={`p-2 rounded-full bg-white/50 dark:bg-zinc-950/50 ${step.iconColorClasses}`}
                  >
                    <step.icon className="size-5 max-md:size-3" />
                  </div>
                </div>
                <div className="grow flex flex-col justify-start">
                  <h3 className="text-2xl max-md:text-lg font-bold mt-4 max-md:mt-0">
                    {step.id === "personaGeneration" && t("steps.personaGeneration.title")}
                    {step.id === "aiInterviews" && t("steps.aiInterviews.title")}
                    {step.id === "behaviorAnalysis" && t("steps.behaviorAnalysis.title")}
                    {step.id === "instantInsights" && t("steps.instantInsights.title")}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 max-md:text-sm max-md:mt-0">
                    {step.id === "personaGeneration" && t("steps.personaGeneration.description")}
                    {step.id === "aiInterviews" && t("steps.aiInterviews.description")}
                    {step.id === "behaviorAnalysis" && t("steps.behaviorAnalysis.description")}
                    {step.id === "instantInsights" && t("steps.instantInsights.description")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
