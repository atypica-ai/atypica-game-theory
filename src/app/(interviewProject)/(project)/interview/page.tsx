import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, Bot, FileText, MessageSquare, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function InterviewProjectHomePage() {
  const t = await getTranslations("InterviewProject.homepage");

  const features = [
    {
      id: "human",
      icon: Users,
      title: t("humanInterviewsTitle"),
      description: t("humanInterviewsDescription"),
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      id: "agent",
      icon: Bot,
      title: t("aiInterviewsTitle"),
      description: t("aiInterviewsDescription"),
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "analytics",
      icon: FileText,
      title: t("analyticsTitle"),
      description: t("analyticsDescription"),
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
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
    <div className="bg-zinc-50 dark:bg-black">
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div
          className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-full mb-8",
            "bg-blue-100 dark:bg-blue-900/30",
          )}
        >
          <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1
          className={cn(
            "font-EuclidCircularA max-w-4xl mx-auto mb-6",
            "font-medium tracking-tight text-4xl md:text-6xl",
          )}
        >
          {t("title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-12">
          {t("subtitle")}
        </p>
        <Button size="lg" className="rounded-full px-8 h-12 text-base" asChild>
          <Link href="/interview/projects">
            {t("getStarted")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.id}
              className="border-0 shadow-sm bg-white dark:bg-zinc-900/50 p-8 text-center space-y-4"
            >
              <div
                className={cn(
                  "inline-flex items-center justify-center w-12 h-12 rounded-full",
                  feature.bgColor,
                )}
              >
                <feature.icon className={cn("h-6 w-6", feature.iconColor)} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {feature.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-32">
        <div className="text-center mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
            {t("howItWorksTitle")}
          </h2>
          <p className="max-w-2xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            {t("howItWorksSubtitle")}
          </p>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div
            className="absolute left-1/2 top-10 bottom-10 w-0.5 bg-zinc-200 dark:bg-zinc-800"
            aria-hidden="true"
          ></div>
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex items-center odd:flex-row-reverse group">
                <div
                  className={cn(
                    "w-1/2 p-8 text-right",
                    "group-odd:text-left group-odd:pl-16 group-even:pr-16",
                  )}
                >
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">{step.description}</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg border-4 border-zinc-50 dark:border-black">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-32">
        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-12 md:p-16 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {t("ctaTitle")}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-8">
            {t("ctaDescription")}
          </p>
          <Button size="lg" className="rounded-full px-8 h-12 text-base" asChild>
            <Link href="/interview/projects">
              {t("createFirstProject")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
