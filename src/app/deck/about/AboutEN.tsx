"use client";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const totalSlides = 22;

const slideNotes: { [key: number]: string } = {
  0: "Hello everyone, today we'll discuss business research agents. Business research is about understanding human decision-making. People don't make purely rational decisions - they're influenced by narratives, emotions, and cognitive biases. Understanding decision mechanisms is the core of business research.",
  1: "Business and social problems are often 'complex problems' with no standard answers. 'Simulation' provides multi-dimensional possibilities for trade-offs, gaming, and constraints. Atypica.AI starts with simulating consumer behavior and decisions.",
  2: "Simulating human behavior and decisions is not a new concept. Before large language models, scholars used mathematical models for group behavior, but these methods were helpless against individual differences and complex subjective decision logic.",
  3: "Large language models enable individual simulation through Agent-Based Modeling (ABM). The core approach: build detailed consumer models using AI agents based on individual data - we call this 'Subjective World Modeling.'",
  4: "Example demonstration: After injecting Harry Potter corpus into a large language model, it can simulate Harry Potter's potential judgments and thinking, inferring behaviors not mentioned in the original text. Test question: Would Harry Potter be more likely to choose coffee or juice for breakfast?",
  5: "Atypica.AI product demo video",
  6: "Atypica.AI uses internal knowledge base, external data sources, and user-uploaded content to first clarify research intent, then build 'user agents' to 'simulate' consumer personality and cognition; then through 'interviews' between 'expert agents' and 'user agents' to analyze consumer behavior and decisions, generating reports.",
  7: "Generative persona establishment and validation. Research shows: humans have about 81% consistency when answering the same question after two weeks, setting this as the consistency baseline (100 points).",
  8: "Modeling validation: Based on personal info, MBTI, Big Five psychological data modeling, consistency score 55-64 points. Based on CRM, CDP consumer data, extracting purchase patterns, brand preferences and other behavioral features, consistency score 73 points.",
  9: "Personal information and personality tests are static data. Behavioral data is dynamic but difficult to understand 'what' and 'why' questions (like what part of a product they like, why they like a product, etc.).",
  10: "Building dynamic consumer models based on social media content, including: Xiaohongshu, Douyin, Instagram, TikTok, X. First input research questions, large language models break down questions for search, find corresponding social media posts and replies, use this as corpus input to generate consumer models. This agent achieves 79 points consistency with real human responses. When processing social media data, Atypica.AI understands consumers through three levels: explicit expression, implicit logic, and emotional association.",
  11: "In-depth interview method: AI conducts 1-2 hour deep interviews with consumers, following up based on responses, generating 5,000-20,000 word transcripts to form complete individual consumer profiles.",
  12: "In-depth interviews cover multiple key dimensions to comprehensively capture individual cognitive patterns, value systems, and behavioral tendencies: life narrative, value exploration, social viewpoint expression, decision pattern analysis. Interview transcripts and analysis dimensions form the consumer&rsquo;s agent. Achieves 85 points in consistency evaluation.",
  13: "Atypica.AI has built 300,000 synthetic consumer agents based on 'social media' data and 10,000 real consumer agents based on 'in-depth interviews'. This number is continuously growing, forming an agent ecosystem covering diverse consumer groups. Users can ask questions, and after identifying business problems, Atypica intelligently calls relevant consumer agents for simulation interviews.",
  14: "Research type classification: Testing, Insight, Planning, Creative - four categories.",
  15: "Atypica.AI application scenarios. Suitable for: early exploration stage, cross-cultural insights, rapid iteration testing, hard-to-reach populations. Limitations: complex behavior observation, high-risk major decisions, deep emotional insights.",
  16: "Four key stages of Atypica.AI technical evolution: Stage 1 theoretical foundation (Stanford Town research), Stage 2 tool capabilities (OpenAI + Claude), Stage 3 reasoning architecture (DeepSeek R1), Stage 4 interaction forms (Cursor, Manus, etc.).",
  17: "Stage 1 theoretical foundation: 2023 Stanford Town 'Generative Agents' first demonstrated multi-agent interaction concept; 2024 'Generative Agent Simulations of 1,000 People' verified 85%+ behavioral consistency, proving commercial application potential.",
  18: "Stage 2 tool breakthrough: December 2023 GPT-4 Function Calling enabled models to call external tools; November 2024 Claude MCP protocol let models actively connect to external world, making Atypica.AI&rsquo;s social media data collection possible.",
  19: "Stage 3 reasoning architecture: February 2025 DeepSeek R1 showed transparent reasoning process, providing direction for designing reasoning architectures. Unlike objective world problems emphasizing 'convergence', business problems need 'divergent' thinking, developing Creative Reasoning long reasoning architecture based on four dimensions.",
  20: "Stage 4 interaction innovation: March 2025 Cursor, Manus, Claude Artifacts, Devin and other products showed multi-agent product design possibilities. Manus&rsquo;s work process visualization innovation improves user trust.",
  21: "From insight to action. Atypica.AI is not a replacement for traditional research but an innovative option providing speed and scale advantages when facing complex social and business problems. Research value lies not in generating reports but in driving effective action. Through connecting more MCPs, Atypica.AI is building a complete ecosystem from insight to execution. Redefining research value. Starting with consumer-understanding agents, Atypica.AI represents a new stage of consumer insight analysis - from passive analysis relying on historical data to active simulation based on intelligent agents. This shift from 'static analysis' to 'dynamic execution' enables companies to complete the full process from problem identification to strategy formulation within hours, achieving agile business models that 'research, decide, and execute' simultaneously.",
};

export function AboutEN({
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
                {`import { Agent } from "atypica";
import { BusinessResearch } from "@/lib/research";

export class ResearchAgent {
  constructor() {
    this.model = new BusinessResearch();
    this.context = "subjective_world";
  }

  async analyze(problem) {
    const insights = await this.model
      .understand(problem)
      .simulate()
      .interview()
      .report();
    return insights;
  }
}`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <h1 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-2">
                Consumer-Understanding Agents
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                atypica.AI
              </h1>
            </div>

            <div className="mb-8 relative z-10">
              <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 opacity-80 mb-4">
                Using &ldquo;Language Models&rdquo; to Model the &ldquo;Subjective World&rdquo;
              </p>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="max-w-4xl bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-lg p-8 relative z-10">
              <div className="border-l-4 border-[#1bff1b] pl-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  Business research is about understanding human decision-making. Decisions are influenced by narratives, emotions, and cognitive biases.
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-80">
                  Understanding decision mechanisms is the core of business research.
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            <div className="absolute top-0 right-0 opacity-5 text-xs overflow-hidden h-full w-1/4">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`// Complex Problems
const complexProblem = {
  hasStandardAnswer: false,
  requiresSimulation: true,
  dimensions: [
    'tradeoffs',
    'game_theory',
    'constraints'
  ]
};

simulation.run(complexProblem);`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 1: Business Research
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Business and social problems are often
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                &ldquo;Complex Problems&rdquo;
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl mb-6 transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  Business and social problems are often
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    &ldquo;complex problems&rdquo;
                  </span>
                  with no standard answers.
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    &ldquo;Simulation&rdquo;
                  </span>
                  provides multi-dimensional possibilities for trade-offs, gaming, and constraints.
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-zinc-600 p-6 rounded-lg text-center shadow-xl">
                <p className="text-base md:text-lg font-medium leading-relaxed text-[#1bff1b]">
                  Atypica.AI starts with simulating consumer behavior and decisions
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            <div className="absolute top-0 right-0 opacity-5 text-xs overflow-hidden h-full w-1/4">
              <pre className="text-zinc-300 opacity-40 font-mono leading-tight">
                {`// Traditional Limitations
const traditionalModels = {
  approach: 'mathematical',
  scope: 'group_behavior',
  limitations: [
    'individual_differences',
    'subjective_logic',
    'complex_decisions'
  ]
};

// LLM Opportunity
const llmModels = {
  enables: 'individual_simulation'
};`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Limitations of Traditional
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                Modeling Methods
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl mb-6 transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  Simulating human behavior and decisions is not a new concept. Before large language models, scholars used mathematical models for group behavior modeling.
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  But these methods were helpless against
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    individual differences
                  </span>{" "}
                  and
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    complex subjective decision logic
                  </span>
                  .
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-700/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-lg transition-all hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <h3 className="text-base font-semibold text-red-400 mb-3">Traditional Mathematical Models</h3>
                  <p className="text-sm font-light text-zinc-300 opacity-80">
                    Treat people as simple entities, ignoring individual differences
                  </p>
                </div>
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-[#1bff1b] p-6 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3">Large Language Model Opportunity</h3>
                  <p className="text-sm font-light text-zinc-300">Individual simulation becomes possible</p>
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
                {`// Agent-Based Modeling
class SubjectiveAgent {
  constructor(personalData) {
    this.data = personalData;
    this.model = new LLM();
    this.context = 'subjective_world';
  }

  simulate(scenario) {
    return this.model.predict(
      this.data,
      scenario
    );
  }
}`}
              </pre>
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Agent-Based Modeling
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                (ABM)
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto space-y-8 relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  Large language models enable individual simulation through Agent-Based Modeling (ABM).
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  The core approach is to build models for individuals based on their detailed data using large language models.
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-8 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-3xl md:text-4xl font-bold mb-4 text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                  &ldquo;Subjective World Modeling&rdquo;
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  Building computable models for individual complex decision logic
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-6">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Example Demonstration
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Harry Potter <span className="font-medium">Modeling Example</span>
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex gap-6">
              <div className="w-2/5 flex flex-col justify-center">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                  <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-6">
                    After injecting the complete Harry Potter corpus into a large language model, the system can build the character&rsquo;s cognitive model, thus inferring behavioral preferences not explicitly mentioned in the original text.
                  </p>
                  <div className="bg-zinc-700 border border-zinc-600 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-[#1bff1b] mb-2">Example Question</p>
                    <p className="text-sm font-light text-zinc-300">
                      &ldquo;Would Harry Potter be more likely to choose coffee or juice for breakfast?&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-3/5 flex flex-col justify-center">
                <div className="bg-zinc-800 border border-zinc-600 rounded-xl overflow-hidden shadow-xl">
                  <div className="bg-zinc-700 px-4 py-3 border-b border-zinc-600 flex items-center gap-3">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <span className="text-[#1bff1b]">🤖</span>
                      AI Model Response
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="bg-[#121212]/50 backdrop-blur-sm p-4 rounded-lg border border-zinc-600">
                      <div className="space-y-3 text-zinc-300 leading-relaxed text-xs">
                        <p className="font-medium text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                          Harry would likely choose juice for breakfast, especially pumpkin juice, rather than coffee.
                        </p>

                        <p className="opacity-90">
                          In the wizarding world, pumpkin juice is a common beverage, often seen during meals at Hogwarts. Throughout the series, there are descriptions of Harry enjoying pumpkin juice at breakfast.
                        </p>

                        <p className="opacity-90">
                          Coffee is never mentioned as something Harry drinks, which isn&rsquo;t surprising given that he&rsquo;s a child or teenager for most of the story. The British setting also suggests that if he were to drink a hot beverage, it would more likely be tea rather than coffee.
                        </p>

                        <p className="opacity-90">
                          Additionally, while students sometimes drink butterbeer on special occasions (though this is more popular in Hogsmeade village), coffee isn&rsquo;t listed as a popular magical beverage in Harry&rsquo;s circle.
                        </p>

                        <p className="font-medium text-[#1bff1b] bg-zinc-800/80 border border-zinc-600 p-2 rounded text-xs shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                          Based on plot clues from the books, Harry Potter would tend to choose juice over coffee at breakfast.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="h-full flex items-center justify-center px-8 py-8">
            <div className="w-full max-w-5xl">
              <div className="bg-zinc-900 rounded-lg overflow-hidden">
                <div className="aspect-video">
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🎥</div>
                      <p className="text-sm font-light text-zinc-300 opacity-60">
                        Product demo video loading...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 2: Building AI Personas
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Research Workflow
              </h2>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                Detailed Process
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-6 rounded-xl border mb-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  atypica.AI generates detailed research reports through
                  <span className="font-medium text-zinc-300">10-20 minute &ldquo;long reasoning&rdquo;</span>
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">1</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Clarify Question</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Analyze research intent</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">2</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Design Task</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Create work sequence</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">3</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Browse Social Media</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Collect data sources</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">4</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Build AI Personas</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Construct agents</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">5</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Interview Simulation</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">AI persona interaction</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">6</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Summarize Results</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Analyze feedback</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">7</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">Generate Report</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">Output insights</p>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-3 rounded-xl border border-zinc-600 mt-4">
                <p className="text-xs text-zinc-300 text-center">
                  <span className="font-semibold text-zinc-300">&ldquo;Nerd Stats&rdquo;</span>
                  record time spent, steps, AI persona count, token consumption during work process, serving as AI&rsquo;s
                  <span className="font-semibold">&ldquo;Proof of Work&rdquo;</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                How to Build &ldquo;Generative Personas&rdquo;
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300">
                  Generative persona construction uses strict validation methods to ensure model accuracy.
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mt-4">
                  Research shows that real users have about 81% consistency when answering the same question two weeks apart, using this as the perfect baseline (100 point standard) to evaluate the effectiveness of different modeling methods.
                </p>
              </div>
              <div className="bg-zinc-700 border-zinc-600 p-6 rounded-xl border text-center">
                <p className="text-xl font-medium text-zinc-300">81% Consistency Baseline</p>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Modeling Validation
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Consistency Comparison of
              </h2>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                Different Data Sources
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <p className="text-sm text-zinc-300 leading-relaxed font-light">
                    <span className="font-semibold text-zinc-300">Evaluation baseline:</span>
                    Real humans have about{" "}
                    <span className="font-semibold">81%</span> consistency when answering the same question two weeks later, setting this as the perfect standard (100 points)
                  </p>
                </div>
              </div>

              <div className="bg-zinc-800 rounded-2xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800/70 backdrop-blur-sm">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-300">
                          Data Source
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-300">
                          Consistency Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-300">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">Personal Info</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            55 points
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          Basic demographic information segmentation
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">Personality Tests</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            64 points
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          MBTI, Big Five personality analysis
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          Consumer Data Platform
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            73 points
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          Enterprise CRM, CDP data analysis
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          Social Media (Targeted)
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            79 points
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          Targeted social media data analysis for specific questions
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-zinc-800/70 backdrop-blur-sm/20">
                        <td className="px-4 py-2 text-xs font-semibold text-zinc-300">In-depth Interviews</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            85 points
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          1-2 hour in-depth interviews, ~5000 words content
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Initial Modeling Methods
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                Limitations of Traditional
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                Data Sources
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-zinc-300">Personal Info Modeling</h3>
                    <div className="bg-zinc-700 px-2 py-1 rounded-full">
                      <span className="text-zinc-300 font-bold text-sm">55 points</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-3 text-sm">
                    Based on demographic info, MBTI, Big Five and other basic data for modeling
                  </p>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <p className="text-xs text-zinc-300 font-medium">
                      ⚠️ Limitation: Static data, lacks dynamic behavioral insights
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-zinc-300">Consumer Data Platform</h3>
                    <div className="bg-zinc-700 px-2 py-1 rounded-full">
                      <span className="text-zinc-300 font-bold text-sm">73 points</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-3 text-sm">
                    Based on CRM, CDP purchase behavior, brand preferences and other data modeling
                  </p>
                  <div className="bg-zinc-700/20 p-3 rounded-lg">
                    <p className="text-xs text-zinc-300 font-medium">
                      ⚠️ Limitation: Hard to understand &ldquo;what&rdquo; and &ldquo;why&rdquo; deeper motivations
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-lg font-semibold text-zinc-300 mb-3">Key Issues</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      Personal info and personality tests are <span className="font-semibold">static data</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      Behavioral data is dynamic but hard to understand
                      <span className="font-semibold"> &ldquo;what&rdquo; and &ldquo;why&rdquo;</span>
                      questions
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      For example: what <span className="font-semibold">part of a product</span> they like,
                      <span className="font-semibold"> why</span> they like a product, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="h-full flex flex-col px-16 py-8">
            <div className="mb-6">
              <div className="text-sm font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Breakthrough Solution
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                Social Media Data Modeling & <span className="font-black">Three-Layer Framework</span>
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-6 rounded-xl border border-zinc-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-zinc-300">Social Media Content Modeling</h3>
                  <div className="bg-zinc-700 px-3 py-1 rounded-full">
                    <span className="font-bold text-xl text-[#1bff1b]">79 points</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <p className="text-zinc-300 leading-relaxed mb-4">
                      Building dynamic consumer models based on
                      <span className="font-semibold text-zinc-300">&ldquo;social media&rdquo;</span>
                      content
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        Xiaohongshu
                      </span>
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        Douyin
                      </span>
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        Instagram
                      </span>
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        TikTok
                      </span>
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        X
                      </span>
                    </div>

                    <div className="bg-zinc-700 p-3 rounded-lg">
                      <p className="text-zinc-300 font-medium text-sm">
                        ✅ Consistency with real human responses can reach{" "}
                        <span className="font-bold text-[#1bff1b]">79 points</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="bg-zinc-700/50 p-4 rounded-lg border border-zinc-600">
                      <h4 className="text-base font-semibold text-[#1bff1b] mb-3">Data Processing Flow</h4>
                      <div className="space-y-2 text-sm text-zinc-300">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Question breakdown and search strategy formulation</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Social media posts and replies collection</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Corpus input and consumer model generation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-zinc-300 mb-4 text-center">
                  Three-Layer Consumer Understanding Framework
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">Explicit Expression</h4>
                    <p className="text-zinc-300 text-sm mb-3">Directly record consumer&rsquo;s explicit preferences and attitudes</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">&ldquo;I like eco-friendly products&rdquo;</p>
                    </div>
                  </div>

                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">Implicit Logic</h4>
                    <p className="text-zinc-300 text-sm mb-3">Identify consumer&rsquo;s underlying thinking patterns</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">Risk aversion, herd mentality</p>
                    </div>
                  </div>

                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">Emotional Association</h4>
                    <p className="text-zinc-300 text-sm mb-3">Analyze emotional tones of different consumption experiences</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">Positive/negative emotional triggers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Methodology Details
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                In-depth Interview
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                Technical Implementation
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  In-depth interview method: AI conducts 1-2 hour deep interviews with consumers, following up based on responses.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">1-2 hrs</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">Interview duration</div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">5,000</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">
                    to 20k word transcripts
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">10k</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">
                    real consumer agents
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">85 pts</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">Consistency evaluation</div>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="text-sm text-zinc-300 opacity-70 font-light">
                  Generating 5,000-20,000 word transcripts to form consumer&rsquo;s
                  <span className="font-semibold">&ldquo;complete profile&rdquo;</span>
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-zinc-300 mb-2">AI Persona Construction Mechanism</h3>
                <p className="text-zinc-300 leading-relaxed text-xs mb-2">
                  Interview transcripts and analysis dimensions form the consumer&rsquo;s agent. When questioned, the agent responds based on the person&rsquo;s expressed views, values, and experiences from the interview.
                </p>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  This method&rsquo;s advantage is maintaining information completeness and contextual coherence, without needing to predetermine which information is important, but letting the language model autonomously identify and utilize relevant information from complete interview content.
                  <span className="font-semibold text-zinc-300"> Achieves 85 points in consistency evaluation.</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 12:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                In-depth Interview Details
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                Four Key Dimensions
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                Comprehensive Individual Capture
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light text-center">
                  In-depth interviews cover multiple key dimensions to
                  <span className="font-semibold text-zinc-300">
                    comprehensively capture individual cognitive patterns, value systems and behavioral tendencies
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Life Narrative</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    Participants tell their life story, including important turning points, setbacks, and achievements. This helps AI understand individual growth trajectory and personality formation.
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Value Exploration</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    Deep exploration of participants&rsquo; core values through open-ended questions, including views on family, work, social responsibility, and understanding of success, happiness, justice.
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Social Viewpoint Expression</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    Collect participants&rsquo; views on current social issues, including political leanings, attitudes toward social problems, expectations for the future, providing foundation for agent performance in social science surveys.
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Decision Pattern Analysis</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    Through specific scenario discussions, understand participants&rsquo; thinking process, weighing factors, and decision criteria when facing choices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 13:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Agent Ecosystem
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                Covering Diverse
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                Consumer Groups
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  Atypica.AI has built an agent ecosystem covering diverse consumer groups, with numbers continuously growing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-4xl font-bold mb-2 text-[#1bff1b]">300k</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Synthetic Consumer Agents</h3>
                  <p className="text-zinc-300 text-xs">Based on &ldquo;social media&rdquo; data construction</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-4xl font-bold mb-2 text-[#1bff1b]">10k</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">Real Consumer Agents</h3>
                  <p className="text-zinc-300 text-xs">Based on &ldquo;in-depth interview&rdquo; data construction</p>
                </div>
              </div>

              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-zinc-800/70 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-zinc-300">Intelligent Calling Process</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">1</span>
                      </div>
                      <p className="text-xs text-zinc-300">User asks question</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">2</span>
                      </div>
                      <p className="text-xs text-zinc-300">Identify business problem</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">3</span>
                      </div>
                      <p className="text-xs text-zinc-300">Intelligently call relevant agents</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">4</span>
                      </div>
                      <p className="text-xs text-zinc-300">Simulation interview</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1bff1b] text-zinc-900 p-3 rounded-lg text-center">
                <p className="text-sm font-semibold">Achieve large-scale, multi-dimensional consumer insight collection</p>
              </div>
            </div>
          </div>
        );

      case 14:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Application Scenarios
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                Research Types
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                Four Categories
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  Research types are divided into
                  <span className="font-semibold text-zinc-300">Testing, Insight, Planning, Creative</span>
                  four categories.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Testing</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">Testing</h3>
                  <p className="text-xs text-zinc-300">Product function testing, user experience validation</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Insight</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">Insight</h3>
                  <p className="text-xs text-zinc-300">Consumer behavior analysis, market trend research</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Planning</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">Planning</h3>
                  <p className="text-xs text-zinc-300">Strategy development, product roadmap planning</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Creative</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">Creative</h3>
                  <p className="text-xs text-zinc-300">Concept innovation, content creation</p>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-[#1bff1b] mb-3 text-center">
                  Typical Research Question Examples
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">Testing</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      Which Logitech mouse topic would be more popular on Xiaohongshu?
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">Insight</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      What feedback is there about LV Shanghai store shopping experience?
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">Planning</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      INAH alcohol-free grape drink market marketing planning
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">Co-creation</h4>
                    <p className="text-xs text-zinc-300 opacity-80">Mars crispy rice new product creative co-creation</p>
                  </div>
                </div>
                <div className="text-center">
                  <a
                    href="/featured-studies"
                    target="_blank"
                    className="inline-block bg-[#1bff1b] text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    View More Research Cases
                  </a>
                </div>
              </div>
            </div>
          </div>
        );

      case 15:
        return (
          <div className="flex-1 flex flex-col px-16 py-8">
            <div className="mb-6">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 2: Building Personas · Application Scenarios
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                atypica.AI <span className="font-black">Application Scenarios</span>
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Early Exploration Stage
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    Quickly validate product concepts, low-cost initial exploration
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    Example: New product creative co-creation, market reaction testing
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Cross-cultural Insights
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    Global market entry strategy, cultural difference analysis
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    Example: Localized marketing, cultural sensitivity testing
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Rapid Iteration Testing
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    A/B testing pre-screening, creative solution evaluation
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    Example: Marketing message optimization, concept rapid evaluation
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Hard-to-reach Populations
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    High-net-worth individuals, professional groups, remote areas
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    Example: High-end customer research, professional market analysis
                  </div>
                </div>
              </div>

              <div className="bg-zinc-700 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-zinc-300 mb-3">Currently Not Suitable Scenarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> Complex behavior observation
                  </div>
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> High-risk major decisions
                  </div>
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> Deep emotional insights
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 16:
        return (
          <div className="flex-1 flex flex-col px-16 py-12">
            <div className="mb-16">
              <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                Part 3: Technical Evolution
              </div>
              <h2 className="text-5xl md:text-6xl font-light tracking-tight text-zinc-300 mb-6">
                Product Idea
              </h2>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-300">Origins</h2>
              <div className="w-16 h-1 bg-[#1bff1b] mt-6"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-16">
                <p className="text-xl text-zinc-300 opacity-70 font-light max-w-3xl mx-auto">
                  Four key stages of atypica.AI technical evolution
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Theoretical Foundation</h3>
                  <p className="text-sm text-zinc-300 opacity-70">Stanford Town research</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Tool Capabilities</h3>
                  <p className="text-sm text-zinc-300 opacity-70">OpenAI + Claude</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Reasoning Architecture</h3>
                  <p className="text-sm text-zinc-300 opacity-70">DeepSeek R1</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">4</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">Interaction Forms</h3>
                  <p className="text-sm text-zinc-300 opacity-70">Cursor, Manus, etc.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 17:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 3: Technical Evolution - Stage 1
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Theoretical Foundation: Stanford Town Research
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2023: Multi-agent Interaction Concept
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  Stanford Town research &ldquo;Generative Agents: Interactive Simulacra of Human Behavior&rdquo; first demonstrated multi-agent interaction possibilities, but didn&rsquo;t deeply show agent interaction mechanisms.
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">2024: Commercial Application Validation</h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  &ldquo;Generative Agent Simulations of 1,000 People&rdquo; successfully simulated behavior patterns of 1000 random Americans, with agent-human behavioral consistency reaching 85%+, validating the commercial potential of agents simulating real human behavior.
                </p>
                <div className="bg-zinc-700 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-[#1bff1b]">85%+ Behavioral Consistency</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 18:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 3: Technical Evolution - Stage 2
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Tool Capability Breakthrough
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  December 2023 - OpenAI GPT-4 Function Calling
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300">
                  Enabled models to call external tools, creating entirely new application scenarios, no longer limiting models to interactions within dialog boxes.
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  November 2024 - Claude MCP Protocol
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  Enabled models to actively connect to the external world, capable of browsing social media, autonomously discovering content, filtering trending topics, analyzing content performance and user feedback.
                </p>
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <p className="text-sm text-zinc-300 font-medium">
                    ✅ Made atypica.AI&rsquo;s social media data collection possible
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 19:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 3: Technical Evolution - Stage 3
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Reasoning Architecture Design
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  February 2025 - DeepSeek R1 Transparent Reasoning
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  Demonstrated transparent reasoning processes, providing direction for designing reasoning architectures on foundation models.
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-lg font-semibold text-zinc-300 mb-4">
                  Divergent vs Convergent: Business Problem Specificity
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-6">
                  Unlike objective world/scientific problems emphasizing &ldquo;convergence&rdquo;, subjective world/business problems need to emphasize &ldquo;divergence&rdquo;
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">Learn Past Cases</h4>
                    <p className="text-xs text-zinc-300 opacity-70">Draw from historical wisdom</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">Eureka Moments</h4>
                    <p className="text-xs text-zinc-300 opacity-70">Innovative breakthroughs</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">Feedback Quality</h4>
                    <p className="text-xs text-zinc-300 opacity-70">High-quality optimization</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">Iteration Count</h4>
                    <p className="text-xs text-zinc-300 opacity-70">Multi-round refinement</p>
                  </div>
                </div>

                <div className="bg-zinc-900 border-2 border-[#1bff1b] text-white p-4 rounded-lg text-center">
                  <p className="text-base font-semibold text-[#1bff1b]">
                    Developed &ldquo;Creative Reasoning&rdquo; long reasoning architecture based on four dimensions
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 20:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 3: Technical Evolution - Stage 4
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                Product Interaction Form Innovation
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  March 2025 - Multi-agent Product Forms
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  The release of Cursor, Manus, Claude Artifacts, Devin and other products demonstrated new possibilities for multi-agent product design.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Cursor</h4>
                    <p className="text-xs text-zinc-300 opacity-70">AI programming assistant</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Manus</h4>
                    <p className="text-xs text-zinc-300 opacity-70">Work process visualization</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Devin</h4>
                    <p className="text-xs text-zinc-300 opacity-70">AI software engineer</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border-2 border-[#1bff1b] text-white p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-3 text-[#1bff1b]">
                  Key Innovation: Work Process Transparency
                </h3>
                <p className="text-sm mb-3">
                  Manus&rsquo;s innovation in agent work process expression and replay functionality is particularly outstanding, allowing users to see the agent&rsquo;s work process.
                </p>
                <p className="text-sm font-medium mb-3">✅ Improves user trust and empathy for AI results</p>
                <p className="text-sm font-medium text-[#1bff1b]">
                  💡 Provides design inspiration for atypica.AI&rsquo;s research process replay functionality
                </p>
              </div>
            </div>
          </div>
        );

      case 21:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                Part 4: Conclusion
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Redefining the Value of
              </h1>
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                Business Research
              </h1>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-6 rounded-xl border">
                  <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                    From
                    <span className="font-medium text-zinc-300">passive analysis</span>
                    relying on historical data, to
                    <span className="font-medium text-zinc-300">active simulation</span>
                    based on intelligent agents
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-4 rounded-xl border">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">Traditional Mode</h3>
                    <p className="text-sm font-light text-zinc-300 opacity-60">Research first, then decide</p>
                  </div>
                  <div className="bg-zinc-700 border-zinc-600 p-4 rounded-xl border">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">AI-driven Mode</h3>
                    <p className="text-sm font-light text-zinc-300">Research, decide, execute simultaneously</p>
                  </div>
                </div>

                <div className="bg-[#1bff1b] text-zinc-900 p-6 rounded-xl text-center">
                  <p className="text-base font-medium mb-2">
                    Research value lies not in generating reports, but in driving effective action
                  </p>
                  <p className="text-sm font-light opacity-80">
                    From &ldquo;research first, then decide&rdquo; to &ldquo;research, decide, execute simultaneously&rdquo;
                  </p>
                </div>
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