"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export const AboutEN: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[560px] md:min-h-[640px] lg:min-h-[720px] overflow-hidden">
        <div className="container mx-auto relative h-full px-4 sm:px-8">
          <div
            className={cn(
              "flex flex-col justify-center items-center text-center min-h-[560px] md:min-h-[640px] lg:min-h-[720px] py-16 md:py-20",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
          >
            <h1 className="relative mb-6">
              <span
                className="max-sm:hidden absolute top-1/2 -translate-y-1/2 rounded-full -left-10 size-5"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              <span
                className="sm:hidden absolute left-1/2 -translate-x-1/2 rounded-full -top-2 w-16 h-0.5"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              <span className="font-EuclidCircularA font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.3]">
                Using <span className="font-bold">Language Models</span> to Model the{" "}
                <span className="font-bold">Subjective World</span>
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-4">
              AI-Powered Intelligence for Business Research
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 max-w-3xl italic">
              &ldquo;People don&apos;t choose between things, they choose between descriptions of
              things.&rdquo; — Daniel Kahneman
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-8 space-y-20 md:space-y-32 py-12">
        {/* Multi-Agent System Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Multi-Agent Collaboration System
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              atypica.AI uses specialized AI agents working together to complete complex business
              research tasks. Each agent has clear responsibilities and expertise, collaborating
              through tool calls and message passing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgentCard
                title="Plan Mode Agent"
                description="Intent clarification layer that transforms vague user needs into executable research plans through flexible dialogue and automatic decision-making."
                features={["Automatic intent classification", "Framework selection", "Cost estimation"]}
              />
              <AgentCard
                title="Study Agent"
                description="Full-process coordinator that guides users to clarify research needs, orchestrates other agents, and generates final reports."
                features={["Research planning", "Agent coordination", "Report generation"]}
              />
              <AgentCard
                title="Scout Agent"
                description="User discovery through social media observation, building detailed personas via 3-stage process: observe → reason → validate."
                features={["Social media analysis", "Persona building", "Behavioral patterns"]}
              />
              <AgentCard
                title="Fast Insight Agent"
                description="Rapid research and podcast generation through automated 5-stage workflow: understand → plan → research → generate → deliver."
                features={["Topic research", "Podcast planning", "Audio generation"]}
              />
              <AgentCard
                title="Interviewer Agent"
                description="Professional interview execution that designs questions, guides conversations, and analyzes results for key insights."
                features={["Interview design", "Conversation guidance", "Insight analysis"]}
              />
              <AgentCard
                title="Persona Agent"
                description="Simulates real users to provide authentic feedback, maintaining behavioral consistency and context memory across interactions."
                features={["User simulation", "Behavioral consistency", "Context memory"]}
              />
              <AgentCard
                title="Sage Agent"
                description="Evolving domain expert agent that achieves continuous learning through structured memory documents, knowledge gap tracking, and supplementary interview mechanisms."
                features={["Memory-based expertise", "Continuous evolution", "Knowledge gap identification"]}
              />
              <AgentCard
                title="Moderator AI"
                description="Discussion facilitator that guides group conversations among 3-8 AI personas, observing opinion clashes and simulating group decision-making scenarios."
                features={["Focus groups", "Roundtable discussions", "Debate facilitation"]}
              />
            </div>
          </div>
        </section>

        {/* Core Technologies Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Core Technologies
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="space-y-6">
              <TechCard
                title="AI Personas (Three Tiers)"
                description="Core research subjects simulated through cognitive modeling"
                items={[
                  "Tier 1: Social Media Personas (79% consistency)",
                  "Tier 2: Deep Interview Personas (85% consistency)",
                  "Tier 3: Proprietary Human Personas (Private)",
                ]}
              />

              <TechCard
                title="Persistent Memory System (Dual-Layer)"
                description="User and team-level memory enabling AI to understand deeper over time"
                items={[
                  "Core Memory: Markdown format, long-term stable user information",
                  "Working Memory: JSON format, new information awaiting integration",
                  "Auto-Reorganization: Triggered when exceeding thresholds, smart compression and deduplication",
                  "Version Management: Complete knowledge source tracking and version history",
                ]}
              />

              <TechCard
                title="Study Expert (Reasoning Model)"
                description="Proprietary reasoning model for research planning and analysis"
                items={[
                  "Plan Mode Integration",
                  "Multi-Step Reasoning",
                  "Cost Estimation & Transparency",
                ]}
              />
            </div>
          </div>
        </section>

        {/* Research Methods Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Research Methods
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-xl mb-3 flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <span>Interview (One-on-One)</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  In-depth one-on-one interviews for capturing individual insights, emotional understanding, and behavioral motivation analysis. Suitable for 5-10 participants.
                </p>
                <ul className="space-y-2">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>Individual insight collection</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>Deep psychological analysis</span>
                  </li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-xl mb-3 flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <span>Discussion (Group)</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Group discussion format with Moderator AI guiding 3-8 AI personas in interaction, observing opinion clashes and simulating group decision-making scenarios.
                </p>
                <ul className="space-y-2">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>Focus Group: Structured topic exploration</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>Roundtable: Open collaborative discussion</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>Debate: Argument-based confrontation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              GEA: Generative Enterprise Architecture
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              atypica.AI is built on GEA (Generative Enterprise Architecture), designed for exploratory knowledge work where starting points are ambiguous, processes uncertain, and judgment is core.
            </p>

            <div className="space-y-6">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  Dual-Agent Architecture
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Separates reasoning from execution for clearer responsibilities and more flexible collaboration
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>Reasoning Agent</strong>: Plans execution paths, prepares context, judges when to adjust direction</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>Execute Agent</strong>: Generic executor that depends on Reasoning Agent&apos;s prepared context</span>
                  </li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  Messages as Source of Truth
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All research content flows through message streams; database stores only derived states
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>Unified Format</strong>: All tools return plainText for consistent processing</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>Generated on Demand</strong>: studyLog generated from messages when needed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Research Types Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Research Types
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResearchTypeCard
                title="Product R&D"
                description="Market trends, user needs, and creative idea generation"
                icon="🔬"
              />
              <ResearchTypeCard
                title="Fast Insight"
                description="Rapid podcast-oriented research with 5-stage automation"
                icon="⚡"
              />
              <ResearchTypeCard
                title="Testing"
                description="Product testing, concept validation, and user feedback"
                icon="🧪"
              />
              <ResearchTypeCard
                title="Insights"
                description="Consumer behavior analysis and market segmentation"
                icon="💡"
              />
              <ResearchTypeCard
                title="Creation"
                description="Content creation, naming, and marketing copy generation"
                icon="✨"
              />
              <ResearchTypeCard
                title="Planning"
                description="Strategic planning and campaign development"
                icon="📋"
              />
            </div>
          </div>
        </section>

        {/* Research Process Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Research Process
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              Simply ask a specific business research question, and the system provides a detailed
              research report through 10-20 minutes of &ldquo;long reasoning.&rdquo;
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { step: 1, title: "Clarify Problem" },
                { step: 2, title: "Design Tasks" },
                { step: 3, title: "Browse Social" },
                { step: 4, title: "Build Personas" },
                { step: 5, title: "Interview Sim" },
                { step: 6, title: "Summarize" },
                { step: 7, title: "Generate Report" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border border-border rounded-lg p-4 text-center hover:border-foreground/20 transition-all"
                >
                  <div className="text-lg font-semibold mb-2" style={{ color: "var(--ghost-green)" }}>
                    {item.step}
                  </div>
                  <p className="text-sm text-foreground/80">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Statistics */}
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
              Platform Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard number="300K+" label="AI Personas Created" />
              <StatCard number="+1M" label="Simulated Interviews" />
              <StatCard number="<30m" label="Average Research Time" />
            </div>
          </div>
        </section>

        {/* Technical Evolution */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              Technical Evolution
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="space-y-4">
              <TimelineItem
                year="2023"
                title="Multi-Persona Interaction"
                description="Stanford Town introduced multi-persona interaction concepts"
                color="gray"
              />
              <TimelineItem
                year="2023.12"
                title="Model Tool Calling"
                description="OpenAI Function Calling and Claude MCP protocol enabled external tool integration"
                color="blue"
              />
              <TimelineItem
                year="2024.11"
                title="Language Models for Subjective World Modeling"
                description="Stanford's breakthrough: 1,000 Americans simulated with 85%+ behavioral consistency"
                color="green"
              />
              <TimelineItem
                year="2025.02"
                title="Divergence-First Long Reasoning"
                description="Unlike objective world reasoning emphasizing 'convergence', subjective world reasoning emphasizes 'divergence'"
                color="yellow"
              />
              <TimelineItem
                year="2025 Mid"
                title="Extended Thinking"
                description="Claude Opus 4 and o1's deep reasoning capabilities enable Plan Mode's intelligent decision-making and intent understanding"
                color="purple"
              />
              <TimelineItem
                year="2025 Late"
                title="Universal Agent + Skills Library"
                description="Anthropic's vision: not building multiple specialized agents, but a universal agent with composable skills—inspiring GEA architecture"
                color="orange"
              />
            </div>
          </div>
        </section>

        {/* HippyGhosts Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              HippyGhosts Community
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="border border-border rounded-lg p-8 hover:border-foreground/20 transition-all">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-6xl">👻</div>
                <div className="flex-1">
                  <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-4">
                    The visual identity of atypica.AI comes from the{" "}
                    <a
                      href="https://hippyghosts.io"
                      className="font-semibold hover:underline"
                      style={{ color: "var(--ghost-green)" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      HippyGhosts.io
                    </a>{" "}
                    community, representing the geek spirit of joyful hippy ghosts.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    In the world of atypica.AI, each &ldquo;AI Persona&rdquo; is embodied as a
                    &ldquo;Hippy Ghost,&rdquo; symbolizing the fusion of technology and creativity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t border-border pt-8">
          <a
            href="/deck/about"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View our pitch deck <ArrowRight className="ml-1 size-4" />
          </a>
        </footer>
      </div>
    </div>
  );
};

// Helper Components

function AgentCard({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
        {title}
      </h3>
      <p className="text-sm text-foreground/80 leading-relaxed mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="text-xs text-muted-foreground flex items-center gap-2">
            <ArrowRight className="size-3 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TechCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
      <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-foreground/80 flex items-start gap-2">
            <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResearchTypeCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
      <div className="text-3xl md:text-4xl font-bold mb-2">{number}</div>
      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function TimelineItem({
  year,
  title,
  description,
  color,
}: {
  year: string;
  title: string;
  description: string;
  color: "gray" | "blue" | "green" | "yellow" | "purple" | "orange";
}) {
  const borderColors = {
    gray: "border-gray-400",
    blue: "border-blue-500",
    green: "border-green-500",
    yellow: "border-yellow-500",
    purple: "border-purple-500",
    orange: "border-orange-500",
  };

  return (
    <div className={`border-l-4 ${borderColors[color]} pl-6 py-2`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
          {year}
        </span>
        <h4 className="font-medium text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
