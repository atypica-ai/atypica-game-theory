"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BrainIcon,
  FileTextIcon,
  LightbulbIcon,
  MessageCircleIcon,
  NetworkIcon,
  TargetIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function SageHomePageClient() {
  const t = useTranslations("Sage.homepage");
  const tRoot = useTranslations("Sage");

  const features = [
    {
      id: "import",
      title: t("importKnowledge"),
      description: t("importDescription"),
      icon: UploadIcon,
      details: [
        { icon: FileTextIcon, text: t("multipleFormats") },
        { icon: TargetIcon, text: t("aiProcessing") },
        { icon: BrainIcon, text: t("memoryDocument") },
      ],
    },
    {
      id: "analysis",
      title: t("knowledgeAnalysis"),
      description: t("analysisDescription"),
      icon: TargetIcon,
      details: [
        { icon: LightbulbIcon, text: t("gapDetection") },
        { icon: NetworkIcon, text: t("dimensionAnalysis") },
        { icon: FileTextIcon, text: t("completenessScore") },
      ],
    },
    {
      id: "interview",
      title: t("supplementaryInterview"),
      description: t("interviewDescription"),
      icon: MessageCircleIcon,
      details: [
        { icon: MessageCircleIcon, text: t("adaptiveQuestions") },
        { icon: TargetIcon, text: t("fillGaps") },
        { icon: UsersIcon, text: t("naturalConversation") },
      ],
    },
    {
      id: "chat",
      title: t("chatWithSage"),
      description: t("chatDescription"),
      icon: BookOpenIcon,
      details: [
        { icon: MessageCircleIcon, text: t("expertConsultation") },
        { icon: BrainIcon, text: t("contextAware") },
        { icon: UsersIcon, text: t("domainSpecific") },
      ],
    },
  ];

  const dimensions = [
    {
      id: "foundational",
      title: t("foundationalTheory"),
      description: t("foundationalDescription"),
      icon: BookOpenIcon,
    },
    {
      id: "practical",
      title: t("practicalExperience"),
      description: t("practicalDescription"),
      icon: TargetIcon,
    },
    {
      id: "industry",
      title: t("industryInsights"),
      description: t("industryDescription"),
      icon: NetworkIcon,
    },
    {
      id: "problem",
      title: t("problemSolving"),
      description: t("problemDescription"),
      icon: LightbulbIcon,
    },
    {
      id: "tools",
      title: t("toolsMethodologies"),
      description: t("toolsDescription"),
      icon: BrainIcon,
    },
    {
      id: "communication",
      title: t("communicationSkills"),
      description: t("communicationDescription"),
      icon: MessageCircleIcon,
    },
    {
      id: "learning",
      title: t("continuousLearning"),
      description: t("learningDescription"),
      icon: UsersIcon,
    },
  ];

  return (
    <FitToViewport className="bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-mono text-sm font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              {tRoot("platformName")}
            </h1>
            <h2 className="font-sans text-4xl md:text-7xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Upload and Creation Form */}
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto my-4 ">
        <Button size="lg" asChild className="w-full h-12">
          <Link href="/sage/create" prefetch={true}>
            {t("startCreation")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="w-full h-12">
          <Link href="/sages" prefetch={true}>
            {t("viewMySages")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Features Section */}
      <section>
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-zinc-200 dark:border-zinc-800">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={cn(
                    "p-6 md:p-10 border-zinc-200 dark:border-zinc-800",
                    index % 2 === 0 && "md:border-r",
                    index < 2 && "border-b",
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <IconComponent className="size-5 text-zinc-600 dark:text-zinc-400" />
                      <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="space-y-2">
                      {feature.details.map((detail, detailIndex) => {
                        const DetailIcon = detail.icon;
                        return (
                          <div key={detailIndex} className="flex items-center gap-2">
                            <DetailIcon className="size-4 text-zinc-500 dark:text-zinc-500" />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {detail.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Analysis Dimensions Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("analysisDimensions")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400">
                {t("dimensionsDescription")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dimensions.map((dimension) => {
                const IconComponent = dimension.icon;
                return (
                  <div
                    key={dimension.id}
                    className="space-y-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <IconComponent className="size-4 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {dimension.title}
                      </h4>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {dimension.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </FitToViewport>
  );
}
