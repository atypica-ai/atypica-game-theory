"use client";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export function PersonaSimulationSection() {
  return (
    <section className="bg-zinc-50 dark:bg-zinc-900 py-20 md:py-28">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-6">
          {/* Technology Overview - Spans 2 columns */}
          <div className="md:col-span-2 bg-zinc-700 dark:bg-zinc-800 text-white rounded-2xl p-8 flex flex-col">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider opacity-60 mb-4">
                Technology Deep Dive
              </p>
              <blockquote className="text-lg md:text-xl leading-relaxed mb-6">
                "Real Person Agents are high-precision consumer simulation technology designed
                specifically to solve complex business problems. Through AI-conducted in-depth
                interviews lasting 1-2 hours with real consumers, we generate an average of 5,000
                words of transcript for each person."
              </blockquote>
              <p className="text-sm opacity-80 mb-6">
                These agents maintain consistent cognitive patterns, emotional responses, and
                decision-making frameworks that enable authentic research conversations - achieving
                85% human-like accuracy in behavioral simulation.
              </p>
            </div>
            <div className="mt-auto">
              <Link
                href="/persona-simulation"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
              >
                Learn more about Real Person Agents
                <ChevronRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-yellow-300 text-zinc-900 rounded-2xl p-8 flex flex-col justify-center text-center">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">Simulation Accuracy</p>
            <div className="text-6xl md:text-7xl font-bold mb-2">85%</div>
            <p className="text-lg">Human-like behavioral consistency in AI persona responses</p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-16">
          {/* What Makes Them Different */}
          <div className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl p-8">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">Core Differentiator</p>
            <h3 className="text-xl font-semibold mb-4">Beyond Demographics</h3>
            <p className="text-sm opacity-80 mb-6">
              Unlike traditional survey data or statistical models, our AI personas are
              sophisticated behavioral simulations that maintain consistent personality traits and
              decision-making logic in new contexts.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">Consistent personality across conversations</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">Authentic emotional responses and biases</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <span className="text-sm">Realistic decision-making patterns</span>
              </div>
            </div>
          </div>

          {/* Agent Ecosystem */}
          <div className="bg-zinc-900 dark:bg-zinc-600 text-white rounded-2xl p-8">
            <p className="text-xs uppercase tracking-wider opacity-60 mb-4">Agent Ecosystem</p>
            <h3 className="text-xl font-semibold mb-4">Scale & Coverage</h3>
            <div className="space-y-4">
              <div className="bg-blue-900/30 p-3 rounded">
                <div className="text-blue-400 font-semibold">300,000 Synthetic Agents</div>
                <div className="text-xs opacity-80">Based on social media data analysis</div>
              </div>
              <div className="bg-green-900/30 p-3 rounded">
                <div className="text-green-400 font-semibold">10,000 Real Person Agents</div>
                <div className="text-xs opacity-80">Based on in-depth interview data</div>
              </div>
              <div className="bg-purple-900/30 p-3 rounded">
                <div className="text-purple-400 font-semibold">Multi-dimensional Coverage</div>
                <div className="text-xs opacity-80">Diverse consumer group ecosystem</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-3xl mx-auto mb-8">
            <h3 className="text-2xl font-EuclidCircularA font-medium mb-4">
              Ready to Experience Real Person Agents?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Start your first AI persona research study and discover deep consumer insights in
              minutes, not weeks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
              <Link href="/study">
                Start Your Research
                <ChevronRightIcon className="h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full h-12 px-8" asChild>
              <Link href="/persona-simulation">Learn More About the Technology</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
