"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const JoinUsEN: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[480px] overflow-hidden">
        <div className="container mx-auto relative h-full px-4 sm:px-8">
          <div
            className={cn(
              "flex flex-col justify-center items-center text-center min-h-[480px] py-16",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
          >
            <h1 className="relative mb-6">
              <span
                className="max-sm:hidden absolute top-1/2 -translate-y-1/2 rounded-full -left-10 size-5"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              <span
                className="sm:hidden absolute left-1/2 -translate-x-1/2 rounded-full -top-2 w-16 h-0.5"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              <span className="font-EuclidCircularA font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.3]">
                Join <span className="font-bold">atypica.AI</span>
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-4">
              Build the future of AI-powered subjective intelligence
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 max-w-3xl italic">
              Join us in modeling the subjective world with language models
            </p>
          </div>
        </div>
      </section>

      {/* Achievement Stats */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-8">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
            Our Achievements So Far
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">300K+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                AI Personas Created
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">+1M</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Simulated Interviews
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">&lt;30m</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Average Research Time
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-8 space-y-20 md:space-y-32 py-12">
        {/* Growth Position */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              Growth
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              Drive growth through creator partnerships and building in public. Help researchers,
              consultants, and analysts create content showcasing real AI research results - turning
              their success stories into our best marketing.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  What You&apos;ll Do
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>
                    • Partner with industry creators (researchers, consultants, analysts) to produce
                    high-quality content showing real atypica.AI use cases and results
                  </li>
                  <li>
                    • Build in public: share product updates, user stories, and insights on
                    Twitter/LinkedIn - making social the primary growth channel
                  </li>
                  <li>
                    • Manage creator partnership program: onboarding, content quality, collaboration
                    workflows
                  </li>
                  <li>
                    • Track what actually moves the needle: not vanity metrics, but content-driven
                    signups and activation
                  </li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  You Should Have
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• Fluent English with strong storytelling and communication skills</li>
                  <li>
                    • Experience with B2B creator partnerships or building communities in public
                  </li>
                  <li>
                    • Product intuition: understand how features become stories, and stories drive
                    growth
                  </li>
                  <li>
                    • Comfortable with high-velocity shipping culture: new features = new content
                    opportunities
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "#1bff1b" }}>
                  &ldquo;Social media is the funnel&rdquo; - growth happens where the conversations
                  are, not in ad dashboards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Position */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              Product
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              Design AI research tools that users love and want to share. Every feature should be
              &ldquo;minimum lovable&rdquo; - delightful enough that users tell others.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  What You&apos;ll Design
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• Research workflows users can instantly understand and love using</li>
                  <li>• AI interaction patterns that feel natural, not mechanical</li>
                  <li>
                    • Features that create &ldquo;wow moments&rdquo; - the kind users screenshot and
                    share
                  </li>
                  <li>• User experiences that drive organic word-of-mouth</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  You Should Have
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>
                    • Deep empathy for researchers, consultants, analysts - you understand their
                    daily work
                  </li>
                  <li>
                    • Design execution: rapid prototyping → user testing → shipping, repeat
                  </li>
                  <li>
                    • Comfort with velocity: in AI, features ship fast or become irrelevant
                  </li>
                  <li>• English fluency for global product thinking</li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "#1bff1b" }}>
                  &ldquo;Minimum lovable product&rdquo; - if users don&apos;t love it enough to share
                  it, keep iterating.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* R&D Position */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              R&D
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              Build the AI research engine that turns business questions into insights. Ship
              features fast enough that the product always feels alive.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  What You&apos;ll Build
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>
                    • AI research workflows: from question → persona creation → interviews →
                    insights
                  </li>
                  <li>• Multi-agent simulation systems for realistic research conversations</li>
                  <li>• Integration layer connecting LLMs, tools, and user workflows</li>
                  <li>• Features that make non-technical users feel powerful</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  You Should Have
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• Full-stack builder: TypeScript, React, modern web architecture</li>
                  <li>• LLM integration experience: prompts, streaming, multi-step reasoning</li>
                  <li>• Bias toward shipping: prototype → test → iterate, fast cycles</li>
                  <li>
                    • Product sense: understand what makes AI features feel magical vs clunky
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "#1bff1b" }}>
                  &ldquo;Ship fast, learn faster&rdquo; - velocity is a feature in AI products.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              Meet the Builders
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-muted-foreground mb-8 text-center">
              Want to learn more about atypica.AI? Chat directly with our builders and explore what
              we&apos;re creating together.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-6 flex items-center space-x-4 hover:border-foreground/20 transition-all">
                <HippyGhostAvatar tokenId={524} className="size-16 rounded-full" />
                <div>
                  <h3 className="font-semibold text-lg">@web3nomad</h3>
                  <a
                    href="https://github.com/web3nomad"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/web3nomad
                  </a>
                </div>
              </div>
              <div className="border border-border rounded-lg p-6 flex items-center space-x-4 hover:border-foreground/20 transition-all">
                <HippyGhostAvatar tokenId={1018} className="size-16 rounded-full" />
                <div>
                  <h3 className="font-semibold text-lg">Ling Fan</h3>
                  <a
                    href="https://www.linkedin.com/in/ling-fan/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    linkedin.com/in/ling-fan
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <div className="max-w-3xl mx-auto border border-border rounded-lg p-8 md:p-12 text-center hover:border-foreground/20 transition-all">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Shape the Future?</h2>
            <p className="text-base md:text-lg text-muted-foreground mb-8">
              Join our mission to model the subjective world and build AI that understands human
              decision-making.
            </p>
            <div className="space-y-4">
              <a
                href="mailto:xd@atypica.ai"
                className="inline-block px-8 py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1bff1b", color: "#000" }}
              >
                xd@atypica.ai
              </a>
              <p className="text-sm text-muted-foreground">
                Please include: resume, portfolio or GitHub links, role of interest
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
