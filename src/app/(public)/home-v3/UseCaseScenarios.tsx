"use client";
import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const useCases = [
  {
    title: "Testing",
    description:
      "Interview AI personas to test marketing messages, product concepts, and campaign ideas with authentic reactions.",
    videoSrc: "/_public/videos/atypica-showcase-testing-20250624.mp4",
    coverImagePrompt:
      "An artistic visualization of consumer decision-making in action. A central figure represents a consumer, surrounded by floating decision factors - emotions, logic, social influences, and past experiences - each glowing with different intensities. These factors flow and interact, gradually converging toward a moment of choice. The composition captures the complex psychology behind how people make purchasing decisions. The palette uses soft blues and whites, emphasizing the clarity of understanding consumer thought processes.",
  },
  {
    title: "Planning",
    description:
      "Create strategic frameworks by interviewing AI personas about preferences and priorities to inform roadmaps.",
    videoSrc: "/_public/videos/atypica-showcase-planning-a-20250624.mp4",
    coverImagePrompt:
      "A simple visualization of strategic prioritization. Scattered planning elements gradually organize themselves into a clear, layered hierarchy. The transformation shows consumer preferences shaping strategic choices into an orderly framework. The composition uses calming greens and whites, emphasizing clarity in planning.",
  },
  {
    title: "Insights",
    description:
      "Uncover behavioral patterns and motivations through interviews with AI personas representing target audiences.",
    videoSrc: "/_public/videos/atypica-showcase-insights-20250624.mp4",
    coverImagePrompt:
      "A captivating visualization of market intelligence emergence. Scattered data points representing consumer behaviors, trends, and market signals gradually coalesce into clear, glowing insights that reveal deeper market truths. The transformation shows the journey from fragmented market data to profound understanding of consumer needs and market dynamics. Each insight pulses with clarity as it crystallizes. The composition uses deep purples and lavenders, emphasizing the revelation of hidden market opportunities.",
  },
  {
    title: "Creation",
    description:
      "Brainstorm and co-create with AI personas to generate innovative ideas and validate creative concepts.",
    videoSrc: "/_public/videos/atypica-showcase-creation-20250624.mp4",
    coverImagePrompt:
      "A clean representation of product development. Individual consumer needs float as simple, glowing elements that gradually connect and form the outline of a new product concept. The composition shows the moment when understanding transforms into innovation. Warm oranges and soft whites create an atmosphere of creative breakthrough.",
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
                      src={`/api/imagegen/dev/${useCase.coverImagePrompt}`}
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
