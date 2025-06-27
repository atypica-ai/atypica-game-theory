"use client";
import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { reginalS3Origin } from "./actions";

const useCases = [
  {
    title: "Testing",
    description:
      "Interview AI personas to test marketing messages, product concepts, and campaign ideas with authentic reactions.",
    videoS3Key: "atypica/public/atypica-showcase-testing-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-testing-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Testing' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    title: "Planning",
    description:
      "Create strategic frameworks by interviewing AI personas about preferences and priorities to inform roadmaps.",
    videoS3Key: "atypica/public/atypica-atypica-showcase-planning-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-planning-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Planning' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    title: "Insights",
    description:
      "Uncover behavioral patterns and motivations through interviews with AI personas representing target audiences.",
    videoS3Key: "atypica/public/atypica-showcase-insights-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-insights-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Insights' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
  {
    title: "Creation",
    description:
      "Brainstorm and co-create with AI personas to generate innovative ideas and validate creative concepts.",
    videoS3Key: "atypica/public/atypica-showcase-creation-20250627.mp4",
    videoPosterS3Key: "atypica/public/atypica-showcase-creation-poster-20250627.png",
    // coverImagePrompt: "Clean modern design on black background. Medium-sized white text 'atypica.AI for Creation' centered. Simple geometric shapes and subtle lines. Professional minimal aesthetic.",
  },
];

export function UseCaseScenarios() {
  const [s3Origin, setS3Origin] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);

  useEffect(() => {
    reginalS3Origin().then((origin) => {
      setS3Origin(origin);
    });
  }, []);

  const handlePlayVideo = useCallback(
    async ({ title }: (typeof useCases)[number]) => {
      if (activeVideoTitle === title) {
        setActiveVideoTitle(null);
      } else {
        setActiveVideoTitle(title);
      }
    },
    [activeVideoTitle],
  );

  if (!s3Origin) {
    return null;
  }

  return (
    <section className="bg-zinc-50 dark:bg-zinc-900 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Research Applications
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            AI Persona Research in Action
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            See how Real Person Agents transform research across different scenarios. From testing
            concepts to uncovering insights, our AI personas provide authentic responses through
            structured interview processes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="group rounded-2xl overflow-hidden flex flex-col border transition-all duration-300 hover:-translate-y-1 "
            >
              <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                {activeVideoTitle === useCase.title ? (
                  <video
                    key={useCase.title}
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
                      alt={`${useCase.title} use case cover`}
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="100%"
                      fill
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <button
                        onClick={() => handlePlayVideo(useCase)}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                        aria-label={`Play video for ${useCase.title}`}
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
              <div className="p-6 flex-grow">
                <h3 className="text-xl font-EuclidCircularA font-medium">{useCase.title}</h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">{useCase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
