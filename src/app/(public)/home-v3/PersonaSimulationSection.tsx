"use client";
import Image from "next/image";

export function PersonaSimulationSection() {
  return (
    <section className="bg-white dark:bg-zinc-950 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Core Technology
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            Real Person Agents
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            Advanced AI agents that simulate authentic human cognition and decision-making patterns.
            Our Real Person Agents maintain consistent personalities, cognitive biases, and
            behavioral frameworks to provide realistic interview responses.
          </p>
        </div>
        {/* Content Section with Background Image */}
        <div className="max-w-6xl mx-auto relative rounded-2xl overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={`/api/imagegen/dev/An elegant visualization of persona development. On the left, diverse human characteristics flow as gentle, abstract patterns - personality traits, emotional responses, and behavioral tendencies represented through flowing organic shapes and subtle data visualizations. These elements gracefully merge in the center, forming cohesive persona silhouettes. On the right, complete AI agents are depicted as refined, humanistic illustrations with soft shadows. The composition uses a sophisticated palette of warm grays, soft blues, and cream tones, creating a professional yet approachable aesthetic that balances technical precision with human warmth.`}
              alt="An elegant visualization of persona development"
              className="object-cover opacity-30 dark:opacity-20"
              sizes="100%"
              fill
            />
          </div>
          {/* Content Overlay */}
          <div className="relative bg-background/70 backdrop-blur-xs p-8 md:p-12">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-EuclidCircularA font-medium mb-6 text-zinc-900 dark:text-zinc-100">
                What are Real Person Agents?
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Unlike traditional survey data or statistical models, our AI personas are
                  sophisticated behavioral simulations that go far beyond demographics.
                </p>
                <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  They maintain consistent cognitive patterns, emotional responses, and
                  decision-making frameworks that enable authentic research conversations and
                  insights.
                </p>
              </div>

              <div className="bg-gradient-to-br from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/70 dark:to-zinc-800/70 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm">
                <h4 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                  Key Capabilities
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-3 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      Consistent personality traits across conversations
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-3 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      Authentic emotional responses and biases
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-3 flex-shrink-0"></div>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      Realistic decision-making patterns
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
