"use client";
import { MicIcon, PackageIcon, StoreIcon, TargetIcon } from "lucide-react";
import Image from "next/image";

const audiences = [
  {
    name: "Alex Chen",
    role: "Marketer",
    description:
      "Test campaign messaging and creative concepts by interviewing diverse AI personas that represent your target audiences.",
    icon: TargetIcon,
    bgColor: "bg-purple-600",
    imagePlaceholder:
      "Professional portrait of a young Asian male marketer in modern business attire, confident smile, creative studio background with marketing materials. Style: modern, professional, creative energy.",
  },
  {
    name: "Maria Garcia",
    role: "Product Manager",
    description:
      "Discover user needs and feature gaps through in-depth interviews with AI personas representing your user base.",
    icon: PackageIcon,
    bgColor: "bg-orange-500",
    imagePlaceholder:
      "Professional portrait of a young woman product manager, warm smile, wearing casual business attire, tech office background with product sketches. Style: approachable, strategic, modern.",
  },
  {
    name: "Sam Taylor",
    role: "UX Researcher",
    description:
      "Map user journeys and uncover pain points by conducting research interviews with behavioral AI agents.",
    icon: StoreIcon,
    bgColor: "bg-yellow-500",
    imagePlaceholder:
      "Professional portrait of a middle-aged man small business owner, confident expression, wearing hoodie, cozy coffee shop or small business background. Style: authentic, entrepreneurial, warm.",
  },
  {
    name: "Jasmine Lee",
    role: "Startup Founder",
    description:
      "Validate market opportunities and refine target audiences through AI persona research and behavioral modeling.",
    icon: MicIcon,
    bgColor: "bg-sky-500",
    imagePlaceholder:
      "Professional portrait of a young woman influencer, bright smile, wearing trendy casual attire, content creation setup background. Style: vibrant, engaging, modern social media aesthetic.",
  },
];

export function AudienceSection() {
  return (
    <section className="bg-zinc-50 dark:bg-black py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
            Built for Research Professionals
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            Atypica transforms how professionals understand consumer behavior through AI-powered
            persona interviews and subjective world modeling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {audiences.map((audience) => (
            <div
              key={audience.name}
              className="group relative flex flex-col items-center text-center"
            >
              {/* Profile Image with Background Shape */}
              <div className="relative mb-6">
                <div
                  className={`absolute inset-0 ${audience.bgColor} rounded-[3rem] transform rotate-6 scale-105 opacity-90`}
                ></div>
                <div className="relative w-48 h-60 rounded-[3rem] overflow-hidden bg-white dark:bg-zinc-900 shadow-xl">
                  <Image
                    src={`/api/imagegen/dev/${audience.imagePlaceholder}`}
                    alt={`${audience.name} - ${audience.role}`}
                    className="object-cover"
                    sizes="100%"
                    fill
                  />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{audience.role}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {audience.name}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
                  {audience.description}
                </p>
              </div>

              {/* Social Icons (placeholder) */}
              <div className="flex items-center gap-3 mt-4 opacity-40">
                <div className="w-4 h-4 bg-zinc-400 dark:bg-zinc-500 rounded-sm"></div>
                <div className="w-4 h-4 bg-zinc-400 dark:bg-zinc-500 rounded-sm"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
