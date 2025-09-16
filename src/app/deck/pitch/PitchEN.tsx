"use client";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const totalSlides = 12;

// Presenter notes in English
const slideNotes: { [key: number]: string } = {
  0: "Welcome to Atypica. We're rewriting the $140B market research industry with AI, transforming traditional surveys into intelligent consumer insights.",
  1: "Market research is at a turning point. Gartner's stock dropped 30% in August 2025, McKinsey growth only 2%, showing traditional consulting models face challenges while AI-native research emerges.",
  2: "Atypica evolves through four stages from traditional consulting to AI-native research, achieving significant advantages in cost, cycle time, and accuracy, especially AI user simulation.",
  3: "Atypica has two core capabilities: AI-native research and AI user simulation. Our goal: 100x cost reduction, 100x speed improvement, 100x user coverage expansion.",
  4: "We built a three-layer AI system: from answers to subjective world. Including AI persona data layer, AI interview workflow layer, and AI research analysis layer.",
  5: "AI personas are our core technology, building consumer models from different data sources. From public social media to deep interviews, we provide multi-tier service options.",
  6: "AI interview features enable direct human-AI dialogue with multimodal interaction. AI can initiate interviews, auto follow-up, and organize virtual focus groups.",
  7: "AI research provides high-quality scientific organization, cross-disciplinary analysis models, and automated report generation, transforming research from survey projects to continuous Always-on analysis.",
  8: "With Atypica, market research achieves three 100x improvements: cost reduction, speed increase, and user coverage expansion, giving every decision real-time consumer perspective.",
  9: "Our product suits different scales of enterprises and individual users, from consumer electronics companies to individual creators, all finding suitable usage patterns.",
  10: "Based on real data from 5000 users, entrepreneurs/freelancers have the highest proportion, followed by consulting/marketing industry, showing broad market demand.",
  11: "Atypica represents the shift from static analysis to dynamic execution, making research not just produce reports but drive effective action, achieving agile business model of research-decide-execute simultaneously.",
};

export function PitchEN({
  showPresenterNotes = false,
}: {
  showPresenterNotes?: boolean;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToNextSlide = useCallback(() => {
    if (currentSlide >= totalSlides - 1) return;
    setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [currentSlide]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide <= 0) return;
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    if (index === currentSlide) return;
    setCurrentSlide(index);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNextSlide, goToPrevSlide]);

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-center items-center text-center px-12 md:px-16 py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 text-xs overflow-hidden h-full w-1/3">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`import { MarketResearch } from "atypica";
import { AI } from "@/lib/intelligence";

export class AtypicaAI {
  constructor() {
    this.market = new MarketResearch();
    this.ai = new AI("subjective_world");
  }

  async research(problem) {
    const insights = await this.ai
      .understand(problem)
      .simulate()
      .analyze()
      .report();
    return insights;
  }
}`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <h1 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-2">
                Atypica
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                Rewriting $140B Market Research with AI
              </h1>
            </div>

            <div className="mb-8 relative z-10">
              <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 opacity-80 mb-4">
                Revolutionary Shift from Traditional Surveys to Smart Insights
              </p>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="max-w-4xl bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-lg p-8 relative z-10">
              <div className="border-l-4 border-[#1bff1b] pl-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  The core question in market research never changes: What are consumers thinking?
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-80">
                  Global enterprises invest over $140B annually, creating consulting giants like McKinsey, Ipsos, and software companies like Qualtrics, Medallia.
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-8 relative">
            <div className="absolute top-0 right-0 opacity-5 text-xs overflow-hidden h-full w-1/4">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`// Market Crisis 2025
const marketTrends = {
  gartner: { decline: "30%", date: "Aug 5" },
  mckinsey: { growth: "2%", reduction: "10%" },
  status: "transformation_needed"
};

console.log("Industry at turning point");`}
              </pre>
            </div>

            <div className="mb-10 relative z-10">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Industry Status
              </div>
              <h2 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-3">
                However, in 2025, the industry reached
              </h2>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                a turning point
              </h2>
              <div className="w-16 h-0.5 mt-6 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10 space-y-8">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-10 rounded-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-4 h-4 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 mb-3">
                      <span className="font-semibold">Gartner stock crashed 30% on Aug 5</span>
                      , largest drop since 1999
                    </p>
                    <p className="text-base text-zinc-300 opacity-70">
                      —Capital markets admit: traditional models face structural challenges
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 mb-3">
                      <span className="font-semibold">McKinsey reports only 2% annual growth</span>, 10% workforce reduction
                    </p>
                    <p className="text-base text-zinc-300 opacity-70">
                      —Brain-intensive, human-driven research models face growth constraints
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-8 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-xl md:text-2xl font-light leading-relaxed text-zinc-300 mb-4">
                  These aren&rsquo;t random fluctuations, but signs of paradigm shift.
                </p>
                <p className="text-lg font-medium text-[#1bff1b]">
                  <span className="font-bold">Atypica.AI was born at this inflection point!</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-8">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Paradigm Evolution
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Four Stages, <span className="font-medium">One Table Shows All</span>
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl mb-8">
                <p className="text-base md:text-lg text-zinc-300 leading-relaxed font-light text-center">
                  Investment firm <span className="font-semibold text-[#1bff1b]">A16Z</span>
                  divides market research paradigm evolution into four stages:
                </p>
              </div>

              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/70 backdrop-blur-sm">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          Paradigm
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          Companies
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          Methods
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          Cycle
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-5 py-4 text-base font-medium text-zinc-300">Traditional</td>
                        <td className="px-5 py-4 text-base text-zinc-300">
                          McKinsey/BCG/Ipsos/Gartner
                        </td>
                        <td className="px-5 py-4 text-base text-zinc-300">Expert judgment + manual analysis</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">Quarterly</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">$1M+</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-5 py-4 text-base font-medium text-zinc-300">
                          Software Research
                        </td>
                        <td className="px-5 py-4 text-base text-zinc-300">Qualtrics/Medallia</td>
                        <td className="px-5 py-4 text-base text-zinc-300">
                          Online surveys, dashboards
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">Weekly</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">$100K</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-5 py-4 text-base font-semibold text-[#1bff1b]">
                          AI-Native Research
                        </td>
                        <td className="px-5 py-4 text-base text-[#1bff1b]">Atypica</td>
                        <td className="px-5 py-4 text-base text-[#1bff1b]">
                          LLM interviews, transcription, analysis
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[#1bff1b]">Daily</td>
                        <td className="px-4 py-3 text-center text-sm text-[#1bff1b]">$100s</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/20">
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">AI User Simulation</td>
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">Atypica</td>
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">
                          Multi-agent behavior modeling, virtual focus groups
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[#1bff1b]">
                          Hourly
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[#1bff1b]">
                          $10s
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            <div className="absolute top-0 right-0 opacity-5 text-xs overflow-hidden h-full w-1/4">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`// Atypica Core Capabilities
const capabilities = {
  aiResearch: {
    automation: "high",
    efficiency: "100x",
    scope: "large_scale"
  },
  aiPersona: {
    multiModal: true,
    realTime: true,
    virtualFocus: "enabled"
  }
};`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Atypica
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                Making Research Business Infrastructure
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10 space-y-8">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4 text-center">
                  Business pace has shifted:
                  <span className="font-semibold text-[#1bff1b]">
                    marketing operates in &ldquo;days&rdquo;, product development in &ldquo;months&rdquo;;
                  </span>
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  Research and insights can no longer operate in
                  <span className="font-semibold text-red-400">&ldquo;years&rdquo;</span>!
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-6 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <h3 className="text-xl font-bold text-[#1bff1b] mb-4">Atypica has two core capabilities:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                    <h4 className="text-lg font-semibold text-[#1bff1b] mb-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                      AI-Native Research
                    </h4>
                    <p className="text-sm text-zinc-300">
                      Automate research with AI for higher efficiency, speed, and scale.
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                    <h4 className="text-lg font-semibold text-[#1bff1b] mb-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                      AI User Simulation
                    </h4>
                    <p className="text-sm text-zinc-300">
                      Model user behavior, values, emotions & decisions with multi-agents, keeping &ldquo;virtual focus groups&rdquo; always online.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border-2 border-[#1bff1b] p-6 rounded-xl text-center">
                <h3 className="text-2xl font-bold text-[#1bff1b] mb-3">Atypica&rsquo;s Value Proposition:</h3>
                <p className="text-xl font-light text-zinc-300">
                  When AI reduces market research costs by <span className="font-bold text-[#1bff1b]">100x</span>
                  , increases speed by <span className="font-bold text-[#1bff1b]">100x</span>, and expands user coverage by
                  <span className="font-bold text-[#1bff1b]"> 100x</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            <div className="mb-6">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                Technical Architecture
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                Building Three-Layer <span className="font-medium">AI System</span>
              </h2>
              <h2 className="text-xl md:text-2xl font-light tracking-tight text-zinc-300 opacity-80 mt-1">
                From &ldquo;Answers&rdquo; to &ldquo;Subjective World&rdquo;
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="max-w-6xl mx-auto space-y-4">
                {/* Layer 3 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">3. Analysis Layer</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI Research</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Scientific Organization</div>
                      <div className="text-xs text-zinc-400">Full text, emotion, opinion tracking</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Cross-disciplinary Models</div>
                      <div className="text-xs text-zinc-400">Built-in professional analysis models</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Automated Reports</div>
                      <div className="text-xs text-zinc-400">AI insights + downloadable/shareable</div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-2">
                  <div className="text-[#1bff1b] text-2xl">↑</div>
                </div>

                {/* Layer 2 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">2. Workflow Layer</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI Interview</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Human→AI</div>
                      <div className="text-xs text-zinc-400">
                        Direct text/multimodal dialogue with AI personas
                      </div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">AI→Human</div>
                      <div className="text-xs text-zinc-400">
                        AI hosts multi-person interviews with auto follow-up
                      </div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">AI→AI</div>
                      <div className="text-xs text-zinc-400">
                        AI organizes virtual focus groups, auto-summarizes
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-2">
                  <div className="text-[#1bff1b] text-2xl">↑</div>
                </div>

                {/* Layer 1 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">1. Data Layer</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI Persona</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 1: Public Social Media
                      </div>
                      <div className="text-xs text-zinc-400">75-79% accuracy, 10-15 min</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 2: Deep Interviews
                      </div>
                      <div className="text-xs text-zinc-400">81-85% accuracy, 1-2 hours</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 3: Enterprise Data
                      </div>
                      <div className="text-xs text-zinc-400">88%+ accuracy, 1-2 hours</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-6xl mx-auto mt-8">
                <div className="bg-zinc-900 border-2 border-[#1bff1b] p-4 rounded-xl text-center">
                  <p className="text-sm text-[#1bff1b] font-medium">
                    Traditional surveys record &ldquo;answers&rdquo;, Atypica models &ldquo;subjective worlds&rdquo;.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            <div className="mb-4">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI Persona Details
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                Core Technology:
              </h2>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-300">
                AI Personas from Multiple Data Sources
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-5 rounded-xl">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center mb-3">
                  Atypica introduces <span className="font-bold text-[#1bff1b]">Subjective World Modeling</span>,
                  using AI to build three-tier personas:
                </p>
              </div>

              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="bg-zinc-700/50 px-4 py-3 border-b border-zinc-600">
                  <h3 className="text-lg font-semibold text-[#1bff1b] text-center">
                    AI Persona Data Sources & Accuracy
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/30">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Tier</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Data Source</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">Accuracy</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">Build Time</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">Tier 1</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Public Social Media</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">75-79%</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">10-15 min</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">$1-10</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">Tier 2</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Deep Interviews</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">81-85%</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">1-2 hours</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">$10-50</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-4 py-3 text-sm font-bold text-[#1bff1b]">Tier 3</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1bff1b]">Enterprise Private Data</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">88%+</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">1-2 hours</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">$10-100</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Tier 1/2 Public Library
                  </h4>
                  <p className="text-xs text-zinc-300 opacity-80">
                    300K+ synthetic + 10K real personas, ready to use
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Tier 3 Private Personas
                  </h4>
                  <p className="text-xs text-zinc-300 opacity-80">
                    Become enterprise assets, continuous learning
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            <div className="mb-6">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI Interview Features
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                Direct Human-AI
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                Dialogue
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">H→AI</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">Human Interviews AI</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    Direct text/multimodal dialogue with AI personas
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">AI→H</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">AI Interviews Human</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    AI hosts multi-person interviews with auto follow-up
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">AI↔AI</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">AI Interviews AI</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    AI organizes virtual focus groups, creates &ldquo;perpetual research networks&rdquo;
                  </p>
                </div>
              </div>

              <div className="bg-zinc-800 rounded-xl border border-zinc-600 p-4">
                <h3 className="text-lg font-semibold text-[#1bff1b] mb-4 text-center">
                  AI Interview Workflow
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">1</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">Intent Clarification</p>
                    <p className="text-xs text-zinc-400">Understand research goals</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">2</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">Smart Matching</p>
                    <p className="text-xs text-zinc-400">Select appropriate AI personas</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">3</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">Simulation Interview</p>
                    <p className="text-xs text-zinc-400">Deep dialogue exchange</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">4</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">Insight Organization</p>
                    <p className="text-xs text-zinc-400">Auto-generate reports</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-4 rounded-xl">
                <div className="flex items-center gap-8">
                  <div className="flex-shrink-0 w-24">
                    <h3 className="text-base font-semibold text-[#1bff1b]">Key Advantages</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">Multimodal Support:</span>
                        <span className="text-zinc-300 opacity-80"> Text, voice, image interactions</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">Smart Follow-up:</span>
                        <span className="text-zinc-300 opacity-80"> Auto-generated deep questions</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">Virtual Focus Groups:</span>
                        <span className="text-zinc-300 opacity-80"> Multiple AI personas participate</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">24/7 Available:</span>
                        <span className="text-zinc-300 opacity-80"> Research anytime, anywhere</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            <div className="mb-3">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI Research Features
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                From Data Collection to
              </h2>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-300">
                Insight Generation
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">📊</span>
                    Scientific Organization
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    Full recording of text, emotions, opinion evolution
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">🔬</span>
                    Cross-disciplinary Models
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    Auto/manual analysis model selection with results & strategy recommendations
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">📄</span>
                    Automated Reports
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    AI-summarized insights + downloadable/shareable research assets
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-3 rounded-xl text-center">
                <h3 className="text-base font-bold text-[#1bff1b] mb-2">Always-on Research Mode</h3>
                <p className="text-xs text-zinc-300 mb-2">
                  Research transforms from &ldquo;survey projects&rdquo; to &ldquo;continuous analysis&rdquo; (Always-on),
                  enabling real-time comprehensive user perspectives for every decision.
                </p>
                <div className="flex gap-2 justify-center text-xs">
                  <div className="bg-zinc-800/50 px-2 py-1 rounded">
                    <span className="font-semibold text-zinc-300">Traditional:</span>
                    <span className="text-zinc-300 opacity-80"> Project-based, periodic</span>
                  </div>
                  <div className="bg-zinc-800/50 px-2 py-1 rounded">
                    <span className="font-semibold text-[#1bff1b]">Always-on:</span>
                    <span className="text-zinc-300"> Continuous, real-time, intelligent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-8 relative">
            <div className="absolute top-0 right-0 opacity-10 text-xs overflow-hidden h-full w-1/3">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`// 100x Impact
const impact = {
  cost: { reduction: "100x" },
  speed: { improvement: "100x" },
  coverage: { expansion: "100x" }
};

const transformation = {
  from: "periodic_research",
  to: "continuous_insights",
  mode: "always_on"
};`}
              </pre>
            </div>

            <div className="mb-6 relative z-10 text-center">
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                With Atypica
              </h1>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_25px_rgba(27,255,27,0.3)]">
                What Changes?
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto mt-4 shadow-[0_0_10px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 max-w-5xl mx-auto w-full relative z-10">
              <div className="text-lg md:text-xl font-light text-zinc-300 text-center mb-2">
                When AI reduces market research costs by <span className="font-bold text-[#1bff1b]">100x</span>,
                increases speed by <span className="font-bold text-[#1bff1b]">100x</span>, and expands user coverage by
                <span className="font-bold text-[#1bff1b]"> 100x</span>:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                  <div className="flex items-start mb-3">
                    <span className="text-2xl mr-3 mt-1">🎯</span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1bff1b] mb-2">Every Business Decision</h3>
                      <p className="text-base text-zinc-300 opacity-90 leading-relaxed">
                        Gets real-time comprehensive user perspectives
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                  <div className="flex items-start mb-3">
                    <span className="text-2xl mr-3 mt-1">⚡</span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1bff1b] mb-2">
                        From Project to Infrastructure
                      </h3>
                      <p className="text-base text-zinc-300 opacity-90 leading-relaxed">
                        Pricing shifts from &ldquo;task/hourly&rdquo; to &ldquo;subscription infrastructure&rdquo; —
                        like cloud computing, making research & insights utilities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] rounded-xl p-6 shadow-[0_0_25px_rgba(27,255,27,0.15)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  But remember: when data and research become more affordable,
                  <span className="font-bold text-[#1bff1b]">
                    true value lies in &ldquo;wisdom&rdquo; and &ldquo;good hypotheses&rdquo;
                  </span>.
                  Asking good questions and building verifiable assumptions are the next competitive barriers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg text-center">
                  <div className="text-base font-semibold text-zinc-400 mb-2">Traditional Mode</div>
                  <div className="text-sm text-zinc-300 opacity-70">Research first, then decide</div>
                </div>
                <div className="bg-zinc-800/50 border border-[#1bff1b]/50 p-4 rounded-lg text-center">
                  <div className="text-base font-semibold text-[#1bff1b] mb-2">Always-on Mode</div>
                  <div className="text-sm text-[#1bff1b]">Research, decide, execute simultaneously</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-8">
            <div className="mb-6">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Use Cases
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                Who Uses
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                Atypica?
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="bg-zinc-700/50 px-4 py-2.5 border-b border-zinc-600">
                  <h3 className="text-lg font-semibold text-[#1bff1b] text-center">Use Case Details</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/30">
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">Customer</th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">Size</th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">Usage</th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">Scenario</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">Electronics Company</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Large</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Interactive AI Persona research for anytime inquiries</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Pre-launch feedback</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">FMCG Company</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Enterprise</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Research for social media & VOC analysis</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Marketing effectiveness</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">Chain Restaurant</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Large</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Interview with 3000 real users</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">2025 strategic planning</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">Global Brand</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Small</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Research simulating Brazil, Chile users</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Cross-cultural adaptation</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">B2B Company</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Medium</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Persona for sales scripts</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Sales training</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">Beauty Brand</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Enterprise</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Research for daily competitor monitoring</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Competitive analysis</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">Consultant</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Individual</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">AI Research for pre-project research</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">Professional services</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">University Professor</td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">Individual</td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">AI Research for real-time classroom cases</td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">Academic research & teaching</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-6">
            <div className="mb-4">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                User Data Insights
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                5000 Users&rsquo;
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                Industry Distribution
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl text-center">
                <p className="text-sm text-zinc-300">
                  Sample: <span className="font-semibold text-[#1bff1b]">5000</span> real user research reports
                </p>
              </div>

              <div className="bg-zinc-800 rounded-xl border border-zinc-600 p-4">
                <h3 className="text-lg font-semibold text-[#1bff1b] mb-4 text-center">
                  Industry Distribution
                </h3>

                <div className="space-y-2">
                  {[
                    { label: "Entrepreneurs/Freelancers", value: 24.8, color: "#1bff1b" },
                    { label: "Consulting/Marketing", value: 17.4, color: "#1bff1b" },
                    { label: "Cross-border E-commerce", value: 12.9, color: "#1bff1b" },
                    { label: "Media/Content", value: 11.4, color: "#1bff1b" },
                    { label: "Internet/Tech", value: 11.1, color: "#1bff1b" },
                    { label: "FMCG/Retail", value: 9.0, color: "#1bff1b" },
                    { label: "Education/Training", value: 7.4, color: "#1bff1b" },
                    { label: "Services", value: 6.7, color: "#1bff1b" },
                    { label: "Finance/Investment", value: 4.6, color: "#1bff1b" },
                    { label: "Manufacturing", value: 4.1, color: "#1bff1b" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-zinc-300 text-right">{item.label}</div>
                      <div className="flex-1 bg-zinc-700 h-6 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#1bff1b] to-[#0d8a0d] transition-all duration-1000 ease-out"
                          style={{ width: `${item.value}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-900">
                          {item.value}%
                        </div>
                      </div>
                      <div className="w-14 text-xs text-zinc-400">{item.value}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2">Main User Characteristics</h4>
                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Innovation-driven</strong>: Entrepreneurs & freelancers lead (24.8%)</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Professional-focused</strong>: Consulting/marketing professionals follow (17.4%)</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Digital transformation</strong>: E-commerce, tech, content industries prominent</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2">Market Demand Trends</h4>
                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Agile decisions</strong>: Fast-changing industries need real-time insights</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Cost-sensitive</strong>: SMEs and individuals need economical solutions</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span><strong>Specialization</strong>: Different industries need customized research methods</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="h-full flex flex-col justify-center items-center px-10 md:px-14 py-8">
            <div className="mb-8 text-center">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-3">
                Future Vision
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Welcome to
              </h1>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.25)]">
                Atypica
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto mt-6 shadow-[0_0_10px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="max-w-5xl mx-auto w-full space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-xl p-6">
                <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 text-center mb-3">
                  Enter <span className="font-bold text-[#1bff1b]">Always-on</span> research mode,
                </p>
                <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 text-center mb-4">
                  making insights accessible, every decision connected to real-time world.
                </p>
                <div className="text-base font-light text-zinc-300 text-center">
                  <p className="mb-1">Research has become cheaper and faster,</p>
                  <p className="font-medium text-[#1bff1b]">but only good questions and hypotheses are truly priceless.</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] rounded-xl p-6 text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-base md:text-lg font-light text-zinc-300 mb-4">
                  From historical data <span className="font-medium">passive analysis</span>
                  to agent-based <span className="font-medium text-[#1bff1b]">active simulation</span>
                </p>
                <p className="text-sm md:text-base text-[#1bff1b] leading-relaxed">
                  This shift from &ldquo;static analysis&rdquo; to &ldquo;dynamic execution&rdquo; enables companies to complete the full process from problem identification to strategy formulation within hours,
                  achieving agile business models that &ldquo;research, decide, and execute&rdquo; simultaneously.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-300 opacity-70">Page not found</h2>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] relative flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-7xl aspect-[16/10] bg-[#121212] relative flex flex-col shadow-2xl border border-zinc-600"
          key={currentSlide}
        >
          {showPresenterNotes && slideNotes[currentSlide] && (
            <div className="absolute top-4 right-4 z-10 group">
              <div className="relative">
                <button className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-[#1bff1b] rounded-full flex items-center justify-center text-xs font-medium shadow-sm transition-all duration-200 hover:scale-105 border border-zinc-600">
                  ?
                </button>

                <div className="absolute top-9 right-0 w-80 bg-zinc-800/95 backdrop-blur-sm border border-zinc-600 rounded-lg shadow-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20">
                  <div className="text-xs font-light text-[#1bff1b] mb-2 uppercase tracking-wide">
                    Speaker Notes {currentSlide + 1}/{totalSlides}
                  </div>
                  <div className="text-sm font-light text-zinc-300 leading-relaxed max-h-32 overflow-y-auto">
                    {slideNotes[currentSlide]}
                  </div>
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-zinc-800/95 border-t border-l border-zinc-600 rotate-45"></div>
                </div>
              </div>
            </div>
          )}

          {renderSlide()}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-zinc-800/90 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-600 shadow-xl">
        {Array.from({ length: totalSlides }, (_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "rounded-full transition-all duration-300 hover:scale-110",
              index === currentSlide
                ? "w-6 h-2 bg-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]"
                : "w-2 h-2 bg-zinc-600 hover:bg-zinc-500",
            )}
          />
        ))}
      </div>

      <div className="absolute top-6 left-6 bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-600 shadow-xl">
        <div className="text-xs font-light text-zinc-300">← → keys to navigate</div>
      </div>

      <div className="absolute top-6 right-6 bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-600 shadow-xl">
        <div className="text-xs font-light text-zinc-300">
          {currentSlide + 1} / {totalSlides}
        </div>
      </div>
    </div>
  );
}