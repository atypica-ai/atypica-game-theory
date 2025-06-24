"use client";
import { BotMessageSquareIcon, BrainCircuitIcon, UsersIcon, ZapIcon } from "lucide-react";
import Image from "next/image";

const processSteps = [
  {
    step: "01",
    title: "Behavioral Data Collection",
    description:
      "Analyze social platforms and real-world behavior patterns to gather comprehensive data on how different groups think, decide, and express themselves",
    icon: UsersIcon,
    colorClasses: "bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-900",
    iconColorClasses: "text-violet-600 dark:text-violet-400",
    imagePlaceholder:
      "A diverse group of abstract, glowing digital avatars materializing from a stream of social media icons. Style: ethereal, data-driven, vibrant.",
  },
  {
    step: "02",
    title: "AI Persona Construction",
    description:
      "Build sophisticated digital twins with consistent personality traits, decision-making logic, and cognitive frameworks that simulate real human responses",
    icon: BotMessageSquareIcon,
    colorClasses: "bg-sky-50 dark:bg-sky-900/30 border-sky-100 dark:border-sky-900",
    iconColorClasses: "text-sky-600 dark:text-sky-400",
    imagePlaceholder:
      "An AI bot icon having a one-on-one conversation with a digital avatar, with sound waves and thought bubbles flowing between them. Style: clean, professional, focused.",
  },
  {
    step: "03",
    title: "Expert Interview Process",
    description:
      "Conduct structured interviews between research experts and AI personas to uncover motivations, preferences, and decision-making patterns",
    icon: BrainCircuitIcon,
    colorClasses: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900",
    iconColorClasses: "text-emerald-600 dark:text-emerald-400",
    imagePlaceholder:
      "A brain-like neural network with glowing nodes representing emotions, thoughts, and cultural symbols being analyzed by a magnifying glass. Style: analytical, intricate, technical.",
  },
  {
    step: "04",
    title: "Insights & Analysis",
    description:
      "Generate comprehensive research reports analyzing behavioral patterns, emotional triggers, and decision factors in minutes instead of weeks",
    icon: ZapIcon,
    colorClasses: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900",
    iconColorClasses: "text-amber-600 dark:text-amber-400",
    imagePlaceholder:
      "A sleek, interactive dashboard materializing instantly from raw data, showing charts and key insights with a glowing, fast-moving effect. Style: modern, dynamic, results-oriented.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white dark:bg-zinc-950 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Subjective world modeling in action
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            How AI Persona Research Works
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            Our methodology creates behavioral digital twins that think, feel, and make decisions
            like real people, then conducts expert interviews to uncover deep consumer insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {processSteps.map((step) => (
            <div
              key={step.step}
              className={`rounded-3xl transition-all duration-300 hover:-translate-y-1 flex flex-col border ${step.colorClasses} overflow-hidden`}
            >
              <div className="aspect-video bg-white/50 dark:bg-zinc-950/50 relative">
                <Image
                  src={`/api/imagegen/dev/${step.imagePlaceholder}`}
                  alt={step.imagePlaceholder}
                  className="object-cover"
                  sizes="100%"
                  fill
                />
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-5xl font-bold text-zinc-300 dark:text-zinc-700">
                    {step.step}
                  </span>
                  <div
                    className={`p-3 rounded-full bg-white/50 dark:bg-zinc-950/50 ${step.iconColorClasses}`}
                  >
                    <step.icon className="w-7 h-7" />
                  </div>
                </div>
                <div className="flex-grow flex flex-col justify-start">
                  <h3 className="text-2xl font-bold mt-4">{step.title}</h3>
                  <p className="mt-3 text-zinc-600 dark:text-zinc-400 text-base">
                    {step.description}
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
