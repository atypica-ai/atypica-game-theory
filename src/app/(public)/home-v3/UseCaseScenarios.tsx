"use client";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getS3CDNOrigin } from "./actions";

const useCases = [
  {
    id: "testing",
    videoS3Key: "atypica/public/atypica-showcase-testing-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-testing-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Testing' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    id: "planning",
    videoS3Key: "atypica/public/atypica-showcase-planning-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-planning-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Planning' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    id: "insights",
    videoS3Key: "atypica/public/atypica-showcase-insights-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-insights-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Insights' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    id: "creation",
    videoS3Key: "atypica/public/atypica-showcase-creation-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-creation-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Creation' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
];

export function UseCaseScenarios() {
  const t = useTranslations("HomePageV3.UseCaseScenarios");
  const [s3Origin, setS3Origin] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);

  useEffect(() => {
    getS3CDNOrigin().then((origin) => {
      setS3Origin(origin);
    });
  }, []);

  const handlePlayVideo = useCallback(
    async ({ id }: (typeof useCases)[number]) => {
      if (activeVideoTitle === id) {
        setActiveVideoTitle(null);
      } else {
        setActiveVideoTitle(id);
      }
    },
    [activeVideoTitle],
  );

  if (!s3Origin) {
    return null;
  }

  return (
    <section className="bg-zinc-100 dark:bg-zinc-800 py-20 md:py-28 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            {t("badge")}
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase) => (
            <div
              key={useCase.id}
              className="group rounded-2xl overflow-hidden flex flex-col border transition-all duration-300 hover:-translate-y-1 "
            >
              <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                {activeVideoTitle === useCase.id ? (
                  <video
                    key={useCase.id}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                    muted
                  >
                    <source src={`${s3Origin}${useCase.videoS3Key}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <>
                    <Image
                      src={`${s3Origin}${useCase.videoPosterS3Key}`}
                      alt={`${
                        useCase.id === "testing"
                          ? t("useCases.testing.title")
                          : useCase.id === "planning"
                            ? t("useCases.planning.title")
                            : useCase.id === "insights"
                              ? t("useCases.insights.title")
                              : t("useCases.creation.title")
                      } use case cover`}
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="600px"
                      fill
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <button
                        onClick={() => handlePlayVideo(useCase)}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                        aria-label={`Play video for ${
                          useCase.id === "testing"
                            ? t("useCases.testing.title")
                            : useCase.id === "planning"
                              ? t("useCases.planning.title")
                              : useCase.id === "insights"
                                ? t("useCases.insights.title")
                                : t("useCases.creation.title")
                        }`}
                      >
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                            <PlayIcon className="w-5 h-5 ml-0.5" fill="currentColor" />
                          </div>
                          <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse"></div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="p-6 grow">
                <h3 className="text-xl font-EuclidCircularA font-medium">
                  {useCase.id === "testing" && t("useCases.testing.title")}
                  {useCase.id === "planning" && t("useCases.planning.title")}
                  {useCase.id === "insights" && t("useCases.insights.title")}
                  {useCase.id === "creation" && t("useCases.creation.title")}
                </h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {useCase.id === "testing" && t("useCases.testing.description")}
                  {useCase.id === "planning" && t("useCases.planning.description")}
                  {useCase.id === "insights" && t("useCases.insights.description")}
                  {useCase.id === "creation" && t("useCases.creation.description")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
