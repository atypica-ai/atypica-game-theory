"use client";

import { PlayCircleIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const useCases = [
  {
    title: "Testing",
    description:
      "Interview AI personas to test marketing messages, product concepts, and campaign ideas. Get authentic reactions and feedback from diverse behavioral digital twins",
    videoSrc: "/_public/videos/atypica-showcase-testing-20250624.mp4",
    coverImage:
      "Digital AI personas reviewing and evaluating marketing content on screens, diverse avatars providing feedback with thumbs up down ratings and emotional reactions, content evaluation interface with sentiment analysis. Style: modern, engaging, persona-focused evaluation.",
  },
  {
    title: "Planning",
    description:
      "Create strategic frameworks by interviewing AI personas about preferences, priorities, and decision factors to inform your roadmaps",
    videoSrc: "/_public/videos/atypica-showcase-planning-a-20250624.mp4",
    coverImage:
      "Marketing strategist working with insights from AI personas, strategy board with consumer behavior patterns feeding into campaign plans, persona-driven recommendations shaping marketing roadmaps. Style: strategic, insightful, modern business planning.",
  },
  {
    title: "Insights",
    description:
      "Uncover behavioral patterns and motivations through in-depth interviews with AI personas representing your target audiences",
    videoSrc: "/_public/videos/atypica-showcase-insights-20250624.mp4",
    coverImage:
      "Analytics dashboard displaying consumer behavior patterns, trend analysis graphs, demographic insights, and market intelligence visualizations with glowing data points. Style: sophisticated, data-rich, analytical interface with modern charts.",
  },
  {
    title: "Creation",
    description:
      "Brainstorm and co-create with AI personas to generate innovative ideas, explore possibilities, and validate creative concepts",
    videoSrc: "/_public/videos/atypica-showcase-creation-20250624.mp4",
    coverImage:
      "Collaborative workspace showing AI personas and human designers co-creating products, ideation boards with sketches and prototypes, innovation process visualization. Style: creative, collaborative, modern design studio aesthetic.",
  },
];

export function UseCaseScenarios() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const handlePlayVideo = (title: string) => {
    setActiveVideo(activeVideo === title ? null : title);
  };

  return (
    <section className="bg-zinc-50 dark:bg-black py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Research Applications
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            AI Persona Research in Action
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            See how behavioral digital twins transform research across different scenarios. From
            testing concepts to uncovering insights, our AI personas provide authentic responses
            through structured interview processes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="group rounded-2xl overflow-hidden flex flex-col border transition-all duration-300 hover:-translate-y-1 "
            >
              <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                {activeVideo === useCase.title ? (
                  <video
                    key={useCase.videoSrc}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                  >
                    <source src={useCase.videoSrc} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <>
                    <Image
                      src={`/api/imagegen/dev/${useCase.coverImage}`}
                      alt={`${useCase.title} use case cover`}
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="100%"
                      fill
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <button
                        onClick={() => handlePlayVideo(useCase.title)}
                        className="text-white/80 hover:text-white transition-colors"
                        aria-label={`Play video for ${useCase.title}`}
                      >
                        <PlayCircleIcon className="w-20 h-20" />
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
