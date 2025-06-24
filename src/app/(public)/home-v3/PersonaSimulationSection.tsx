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
            Behavioral Digital Twins
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            Advanced AI agents that simulate authentic human cognition and decision-making patterns.
            Our digital twins maintain consistent personalities, cognitive biases, and behavioral
            frameworks to provide realistic interview responses.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-2xl font-bold mb-4">What are Behavioral Digital Twins?</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Unlike traditional survey data or statistical models, our AI personas are
              sophisticated behavioral simulations. They maintain consistent cognitive patterns,
              emotional responses, and decision-making frameworks that enable authentic research
              conversations and insights.
            </p>
          </div>
          <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-xl relative">
            <Image
              src={`/api/imagegen/dev/Abstract visualization of AI digital twins, network of interconnected nodes representing diverse consumer personas, glowing with neural network patterns, futuristic and clean aesthetic.`}
              alt="Abstract visualization of AI digital twins, network of interconnected nodes representing diverse consumer personas, glowing with neural network patterns, futuristic and clean aesthetic."
              className="object-cover"
              sizes="100%"
              fill
            />
          </div>
        </div>
      </div>
    </section>
  );
}
