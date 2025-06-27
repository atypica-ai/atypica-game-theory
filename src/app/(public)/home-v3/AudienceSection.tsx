"use client";
import { MessageSquareIcon, PackageIcon, SearchIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

const audiences = [
  {
    id: "marketer",
    icon: TrendingUpIcon,
    bgColor: "bg-purple-600",
    imagePlaceholder:
      "Professional portrait of a young Asian male marketer in modern business attire, confident smile, creative studio background with marketing materials. Style: modern, professional, creative energy.",
  },
  {
    id: "productManager",
    icon: PackageIcon,
    bgColor: "bg-orange-500",
    imagePlaceholder:
      "Professional portrait of a young woman product manager, warm smile, wearing casual business attire, tech office background with product sketches. Style: approachable, strategic, modern.",
  },
  {
    id: "uxResearcher",
    icon: SearchIcon,
    bgColor: "bg-yellow-500",
    imagePlaceholder:
      "Professional portrait of a middle-aged man small business owner, confident expression, wearing hoodie, cozy coffee shop or small business background. Style: authentic, entrepreneurial, warm.",
  },
  {
    id: "startupFounder",
    icon: MessageSquareIcon,
    bgColor: "bg-sky-500",
    imagePlaceholder:
      "Professional portrait of a young woman influencer, bright smile, wearing trendy casual attire, content creation setup background. Style: vibrant, engaging, modern social media aesthetic.",
  },
];

export function AudienceSection() {
  const t = useTranslations("HomePageV3.AudienceSection");
  return (
    <section className="bg-zinc-50 dark:bg-black py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {audiences.map((audience) => (
            <div
              key={audience.id}
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
                    alt={`${
                      audience.id === "marketer"
                        ? t("audiences.marketer.name")
                        : audience.id === "productManager"
                          ? t("audiences.productManager.name")
                          : audience.id === "uxResearcher"
                            ? t("audiences.uxResearcher.name")
                            : t("audiences.startupFounder.name")
                    } - ${
                      audience.id === "marketer"
                        ? t("audiences.marketer.role")
                        : audience.id === "productManager"
                          ? t("audiences.productManager.role")
                          : audience.id === "uxResearcher"
                            ? t("audiences.uxResearcher.role")
                            : t("audiences.startupFounder.role")
                    }`}
                    className="object-cover"
                    sizes="100%"
                    fill
                  />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  {audience.id === "marketer" && t("audiences.marketer.role")}
                  {audience.id === "productManager" && t("audiences.productManager.role")}
                  {audience.id === "uxResearcher" && t("audiences.uxResearcher.role")}
                  {audience.id === "startupFounder" && t("audiences.startupFounder.role")}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  {audience.id === "marketer" && t("audiences.marketer.name")}
                  {audience.id === "productManager" && t("audiences.productManager.name")}
                  {audience.id === "uxResearcher" && t("audiences.uxResearcher.name")}
                  {audience.id === "startupFounder" && t("audiences.startupFounder.name")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
                  {audience.id === "marketer" && t("audiences.marketer.description")}
                  {audience.id === "productManager" && t("audiences.productManager.description")}
                  {audience.id === "uxResearcher" && t("audiences.uxResearcher.description")}
                  {audience.id === "startupFounder" && t("audiences.startupFounder.description")}
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
