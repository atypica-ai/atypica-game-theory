"use client";
import { getS3CDNUrl } from "@/app/(public)/home-v3/actions";
import { useDeckScale } from "@/app/deck/hooks/useDeckScale";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const totalSlides = 22;

// 演讲稿内容映射
const slideNotes: { [key: number]: string } = {
  0: "大家好，今天和大家一起聊聊商业研究的 agent。商业研究是一门理解人类决策的学问。人并不只是根据纯粹理性做决策，而是受到叙事、情感和认知偏见的影响。所以，理解影响决策的机制是商业研究的核心。",
  1: '商业和社会问题往往是一个"复杂问题"，它没有标准答案。"模拟（simulation）"为这些问题提供了权衡、博弈、约束的多维可能性。Atypica.AI从模拟消费者的行为和决策入手。',
  2: "模拟人的行为和决策并不是新概念。在大语言模型出现前，学者通过数学模型为人的群体行为建模，但这些方法对个体差异和复杂的主观决策逻辑却束手无策。",
  3: '大语言模型为个体模拟提供了可能性，可以通过智能体为消费者建模（Agent-Based Modeling, ABM），其核心思路是基于一个人的详细数据，通过大语言模型为这个人建立模型，称为"主观世界建模法"。',
  4: "实例演示：为大语言模型注入《哈利·波特》的语料后，能够模拟哈利波特的潜在判断和思路，推断出其在原文中没有提到的行为。测试问题：哈利·波特早餐更可能选择咖啡还是果汁？",
  5: "atypica.AI产品演示视频",
  6: "atypica.AI 会利用内部知识库、外部数据源和用户在产品中上传的内容，首先对用户的研究问题进行意图澄清，然后通过构建「用户智能体」来「模拟」消费者的个性和认知；然后通过「专家智能体」与「用户智能体」的「访谈」来分析消费者的行为和决策，并产生报告。",
  7: "生成式人设建立方法与验证。研究表明：人对同一问题在相隔两周的回答一致性约为81%，将此设定为一致性基线（100分满分）。",
  8: "建模效果验证：基于个人信息、MBTI、Big Five等心理测量数据建模，一致性得分55-64分。基于CRM、CDP消费者数据，提取购买模式、品牌偏好等行为特征建模，一致性得分73分。",
  9: "个人信息、性格测试都是静态的数据，行为数据虽然是动态的，但是难以了解what和why的问题（比如喜欢一个产品的什么部分，为什么喜欢一个产品等）。",
  10: "基于社交媒体内容建立动态消费者模型，包括：小红书、抖音、Instagram、TikTok、X。首先输入需要调研的问题，大语言模型对这个问题进行拆解来进行搜索，找到对应社交媒体发帖和回帖，以此作为语料输入大模型产生出消费者模型。此智能体与真人回答的一致性可以达到79分。在处理社交媒体数据时，Atypica.AI通过三个层次来理解消费者：显性表达层、隐性逻辑层、情感关联层。",
  11: "深度访谈方法：通过AI对消费者进行1-2小时的深入访谈，根据回答进行追问，生成平均五千到二万字的转录文本，形成个体消费者的完整画像。",
  12: "深度访谈涵盖了多个关键维度，旨在全面捕捉个体的认知模式、价值体系和行为倾向：生活历程叙述、价值观探索、社会观点表达、决策模式分析。访谈的笔录，以及上述分析的维度，就形成了这个消费者的智能体。在一致性的评测中达到85分。",
  13: 'Atypica.AI目前已建立30万个基于"社交媒体"数据的合成消费者智能体和1万个基于"深度访谈"的真实消费者智能体。这个数字在持续增加，形成了覆盖多元化消费群体的智能体生态。用户可以进行提问，判别是商业问题后，Atypica会智能调用相关消费者智能体进行模拟访谈。',
  14: "研究类型分类：测试、洞察、规划、创意四大类别。",
  15: "atypica.AI适用场景分析。适用：早期探索阶段、跨文化洞察、快速迭代测试、难触达人群研究。局限：复杂行为观察、高风险重大决策、深度情感洞察。",
  16: "atypica.AI技术演进的四个关键阶段：第一阶段理论基础（斯坦福小镇研究），第二阶段工具能力（OpenAI + Claude），第三阶段推理架构（DeepSeek R1），第四阶段交互形态（Cursor, Manus等）。",
  17: "第一阶段理论基础：2023年斯坦福小镇《Generative Agents》首次展示多智能体互动概念；2024年《Generative Agent Simulations of 1,000 People》验证了85%以上行为一致性，证明了商业应用潜力。",
  18: "第二阶段工具突破：2023年12月GPT-4 Function Calling让模型调用外部工具；2024年11月Claude MCP协议让模型主动连接外部世界，使atypica.AI的社交媒体数据收集成为可能。",
  19: "第三阶段推理架构：2025年2月DeepSeek R1展示透明推理过程，为设计推理架构提供方向。与客观世界问题强调'收敛'不同，商业问题需要'发散'思维，基于四个维度开发Creative Reasoning长推理架构。",
  20: "第四阶段交互创新：2025年3月Cursor、Manus、Claude Artifacts、Devin等产品展示多智能体产品设计可能性。Manus的工作过程可视化创新提升用户信任度。",
  21: '从洞察到行动。Atypica.AI的定位并非传统调研的替代者，而是在面对复杂的社会和商业问题时，提供速度与规模优势的创新选项。调研的价值不在于产生报告，而在于驱动有效行动。通过接入更多的MCP，Atypica.AI正在构建从洞察到执行的完整生态。重新定义调研价值。从懂消费者的智能体开始，Atypica.AI代表了消费者洞察分析的新阶段——从依赖历史数据的被动分析，转向基于智能体的主动模拟。这种从"静态分析"到"动态执行"的转变，让企业能够在几小时内完成从问题识别到策略制定的全流程，实现从"先研究，再决策"到"边研究，边决策，边执行"的敏捷商业模式。',
};

export function AboutZH({ showPresenterNotes = false }: { showPresenterNotes?: boolean }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [posterSrc, setPosterSrc] = useState<string | null>(null);
  const { deckStyles } = useDeckScale({ deckWidth: 1200 });
  const { isMobile } = useDevice();

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

  useEffect(() => {
    getS3CDNUrl("atypica/public/atypica-promo-20250627.mp4").then((res) => {
      setVideoSrc(res);
    });
    getS3CDNUrl("atypica/public/atypica-promo-video-poster-20250624.jpeg").then((res) => {
      setPosterSrc(res);
    });
  }, []);

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-center items-center text-center px-12 md:px-16 py-10 relative overflow-hidden">
            {/* 背景装饰 */}
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

            {/* 主标题 */}
            <div className="mb-8 relative z-10">
              <h1 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-2">
                懂消费者的智能体
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                atypica.AI
              </h1>
            </div>

            {/* 副标题 */}
            <div className="mb-8 relative z-10">
              <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 opacity-80 mb-4">
                用「语言模型」为「主观世界」建模
              </p>
              <div className="w-20 h-0.5 bg-linear-to-r from-transparent via-[#1bff1b] to-transparent mx-auto shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 描述文字 */}
            <div className="max-w-4xl bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-lg p-8 relative z-10">
              <div className="border-l-4 border-[#1bff1b] pl-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  商业研究是理解人类决策的学问。人的决策受到叙事、情感和认知偏见的影响。
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-80">
                  理解决策机制是商业研究的核心。
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            {/* 背景装饰 */}
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

            {/* 标题 */}
            <div className="mb-8 relative z-10">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                第一部分：商业研究
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                商业和社会问题往往是
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                &ldquo;复杂问题&rdquo;
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-linear-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl mb-6 transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  商业和社会问题往往是一个
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    &ldquo;复杂问题&rdquo;
                  </span>
                  ，它没有标准答案。
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    &ldquo;模拟（Simulation）&rdquo;
                  </span>
                  为这些问题提供了权衡、博弈、约束的多维可能性。
                </p>
              </div>

              <div className="bg-linear-to-r from-[#1e1e1e] to-[#2a2a2a] border border-zinc-600 p-6 rounded-lg text-center shadow-xl">
                <p className="text-base md:text-lg font-medium leading-relaxed text-[#1bff1b]">
                  Atypica.AI 从模拟消费者的行为和决策入手
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            {/* 背景装饰 */}
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

            {/* 标题 */}
            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                传统建模方法的
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                局限性
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-linear-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl mb-6 transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  模拟人的行为和决策并不是新概念。在大语言模型出现前，学者通过数学模型为人的群体行为建模。
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  但这些方法对
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    个体差异
                  </span>{" "}
                  和
                  <span className="font-semibold text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                    复杂的主观决策逻辑
                  </span>
                  却束手无策。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-700/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-lg transition-all hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <h3 className="text-base font-semibold text-red-400 mb-3">传统数学模型</h3>
                  <p className="text-sm font-light text-zinc-300 opacity-80">
                    把人看做简单实体，忽略个体差异
                  </p>
                </div>
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-[#1bff1b] p-6 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3">大语言模型机会</h3>
                  <p className="text-sm font-light text-zinc-300">个体模拟成为可能</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10 relative">
            {/* 背景装饰 */}
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

            {/* 标题 */}
            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                智能体建模
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                (ABM)
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-linear-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto space-y-8 relative z-10">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-8 rounded-xl transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  大语言模型为个体模拟提供了可能性，可以通过智能体为消费者建模（Agent-Based
                  Modeling, ABM）。
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  其核心思路是基于一个人的详细数据，通过大语言模型为这个人建立模型。
                </p>
              </div>

              <div className="bg-linear-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-8 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-3xl md:text-4xl font-bold mb-4 text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                  &ldquo;主观世界建模法&rdquo;
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-90">
                  为个体的复杂决策逻辑建立可计算模型
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-6">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                实例演示
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                哈利·波特的<span className="font-medium">建模例子</span>
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            {/* 左右布局 */}
            <div className="flex-1 flex gap-6">
              {/* 左侧：问题描述 */}
              <div className="w-2/5 flex flex-col justify-center">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl transition-all hover:border-[#1bff1b] hover:shadow-[0_0_20px_rgba(27,255,27,0.1)]">
                  <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-6">
                    为大语言模型注入《哈利·波特》的完整语料，系统能够构建该角色的认知模型，从而推断原文中未明确提及的行为偏好。
                  </p>
                  <div className="bg-zinc-700 border border-zinc-600 p-4 rounded-lg text-center">
                    <p className="text-sm font-semibold text-[#1bff1b] mb-2">示例问题</p>
                    <p className="text-sm font-light text-zinc-300">
                      &ldquo;哈利·波特早餐更可能选择咖啡还是果汁？&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* 右侧：AI回答 */}
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
                      AI模型回答
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="bg-[#121212]/50 backdrop-blur-sm p-4 rounded-lg border border-zinc-600">
                      <div className="space-y-3 text-zinc-300 leading-relaxed text-xs">
                        <p className="font-medium text-[#1bff1b] shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                          哈利早餐大概率会选择喝果汁，尤其是南瓜汁，而非咖啡。
                        </p>

                        <p className="opacity-90">
                          在魔法世界里，南瓜汁是一种常见饮品，霍格沃茨用餐时经常能看到它的身影。在整个系列故事中，常有哈利在吃早餐时享用南瓜汁的描写。
                        </p>

                        <p className="opacity-90">
                          书中并未提及哈利喝过咖啡，鉴于他在故事大部分时间里还是个孩子或青少年，这也不足为奇。而且故事背景设定在英国，这也暗示着，如果他要喝热饮，更有可能选择茶而不是咖啡。
                        </p>

                        <p className="opacity-90">
                          此外，在霍格沃茨的特殊场合，学生们有时会喝黄油啤酒（过这种饮品更多是在霍格莫德村流行），但在哈利身边人的圈子里，咖啡并未被列为受欢迎的魔幻饮品。
                        </p>

                        <p className="font-medium text-[#1bff1b] bg-zinc-800/80 border border-zinc-600 p-2 rounded text-xs shadow-[0_0_8px_rgba(27,255,27,0.35)]">
                          基于书中的情节线索，哈利·波特在早餐时更倾向于选择果汁而非咖啡。
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
                  {videoSrc && posterSrc ? (
                    <video
                      key={videoSrc}
                      poster={posterSrc}
                      className="w-full h-full object-cover"
                      controls
                      loop
                      playsInline
                    >
                      <source src={videoSrc} type="video/mp4" />
                      您的浏览器不支持视频标签。
                    </video>
                  ) : (
                    <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-4">🎥</div>
                        <p className="text-sm font-light text-zinc-300 opacity-60">
                          产品演示视频加载中...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                第二部分：构建AI人设
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                研究工作
              </h2>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                流程详解
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-6 rounded-xl border mb-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  atypica.AI通过
                  <span className="font-medium text-zinc-300">10-20分钟「长推理」</span>
                  生成详尽调研报告
                </p>
              </div>

              {/* 7-step process grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">1</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">明确问题</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">分析研究意图</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">2</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">设计任务</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">制定工作序列</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">3</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">浏览社媒</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">收集数据源</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">4</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">建立AI人设</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">构建智能体</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">5</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">访谈模拟</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">AI人设交互</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">6</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">总结结果</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">分析反馈</p>
                </div>

                <div className="bg-zinc-800 border-zinc-600 p-3 rounded-lg border text-center">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                    <span className="text-zinc-900 text-xs font-bold">7</span>
                  </div>
                  <h3 className="text-xs font-medium text-zinc-300 mb-1">生成报告</h3>
                  <p className="text-xs font-light text-zinc-300 opacity-60">输出洞察</p>
                </div>
              </div>

              {/* Proof of Work note */}
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-3 rounded-xl border border-zinc-600 mt-4">
                <p className="text-xs text-zinc-300 text-center">
                  <span className="font-semibold text-zinc-300">「Nerd Stats」</span>
                  会记录工作过程中耗费的时间、步骤、AI人设角色数量、token消耗等，这也是一种AI的
                  <span className="font-semibold">「工作证明」（Proof of Work）</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                如何建立「生成式人设」
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300">
                  生成式人设构建采用严格的验证方法来确保模型准确性。
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mt-4">
                  研究表明，真实用户对同一问题在两周间隔内的回答一致性约为81%，将此作为满分基准（100分标准分），用于评估不同建模方法的有效性。
                </p>
              </div>
              <div className="bg-zinc-700 border-zinc-600 p-6 rounded-xl border text-center">
                <p className="text-xl font-medium text-zinc-300">81% 一致性基线</p>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                建模效果验证
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                不同数据源的
              </h2>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                一致性对比
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <p className="text-sm text-zinc-300 leading-relaxed font-light">
                    <span className="font-semibold text-zinc-300">评估基准：</span>
                    真实人类对同一问题在相隔两周后的回答一致性约为{" "}
                    <span className="font-semibold">81%</span>，将此设定为满分标准（100分）
                  </p>
                </div>
              </div>

              {/* Performance Table */}
              <div className="bg-zinc-800 rounded-2xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800/70 backdrop-blur-sm">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-300">
                          数据来源
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-300">
                          一致性得分
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-300">
                          特点描述
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">个人信息</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            55分
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          人口普查信息等基础细分
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">性格测试</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            64分
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          MBTI、Big Five等性格导向分析
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          消费者数据平台
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            73分
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          企业CRM、CDP数据分析
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          社交媒体（特定）
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            79分
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-300 opacity-70">
                          针对特定问题的社交媒体数据分析
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-zinc-800/70 backdrop-blur-sm/20">
                        <td className="px-4 py-2 text-xs font-semibold text-zinc-300">深度访谈</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                            85分
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-zinc-300">
                          1-2小时深度访谈，约5000字内容
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
                初期建模方法
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                传统数据源的
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                局限性分析
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 个人信息方法 */}
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-zinc-300">个人信息建模</h3>
                    <div className="bg-zinc-700 px-2 py-1 rounded-full">
                      <span className="text-zinc-300 font-bold text-sm">55分</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-3 text-sm">
                    基于人口普查信息、MBTI、Big Five等基础数据进行建模
                  </p>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <p className="text-xs text-zinc-300 font-medium">
                      ⚠️ 局限性：静态数据，缺乏动态行为洞察
                    </p>
                  </div>
                </div>

                {/* CDP/CRM数据方法 */}
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-zinc-300">消费者数据平台</h3>
                    <div className="bg-zinc-700 px-2 py-1 rounded-full">
                      <span className="text-zinc-300 font-bold text-sm">73分</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-3 text-sm">
                    基于CRM、CDP中的购买行为、品牌偏好等数据建模
                  </p>
                  <div className="bg-zinc-700/20 p-3 rounded-lg">
                    <p className="text-xs text-zinc-300 font-medium">
                      ⚠️ 局限性：难以了解&ldquo;what&rdquo;和&ldquo;why&rdquo;的深层动机
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-lg font-semibold text-zinc-300 mb-3">关键问题</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      个人信息、性格测试都是<span className="font-semibold">静态数据</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      行为数据虽然是动态的，但难以了解
                      <span className="font-semibold">&ldquo;what&rdquo;和&ldquo;why&rdquo;</span>
                      的问题
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full mt-1.5 shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      比如：喜欢一个产品的<span className="font-semibold">什么部分</span>，
                      <span className="font-semibold">为什么</span>喜欢一个产品等
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
            {/* Header - 紧凑设计 */}
            <div className="mb-6">
              <div className="text-sm font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                突破性解决方案
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                社交媒体数据建模与<span className="font-black">三层理解框架</span>
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              {/* 社交媒体数据建模部分 */}
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-6 rounded-xl border border-zinc-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-zinc-300">社交媒体内容建模</h3>
                  <div className="bg-zinc-700 px-3 py-1 rounded-full">
                    <span className="font-bold text-xl text-[#1bff1b]">79分</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧：建模描述 */}
                  <div>
                    <p className="text-zinc-300 leading-relaxed mb-4">
                      基于
                      <span className="font-semibold text-zinc-300">&ldquo;社交媒体&rdquo;</span>
                      内容建立动态消费者模型
                    </p>

                    {/* 平台标签 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        小红书
                      </span>
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full text-xs font-medium">
                        抖音
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
                        ✅ 与真人回答一致性可达到{" "}
                        <span className="font-bold text-[#1bff1b]">79分</span>
                      </p>
                    </div>
                  </div>

                  {/* 右侧：分析方法说明 */}
                  <div>
                    <div className="bg-zinc-700/50 p-4 rounded-lg border border-zinc-600">
                      <h4 className="text-base font-semibold text-[#1bff1b] mb-3">数据处理流程</h4>
                      <div className="space-y-2 text-sm text-zinc-300">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 shrink-0"></span>
                          <span>问题拆解与搜索策略制定</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 shrink-0"></span>
                          <span>社交媒体发帖与回帖收集</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1.5 shrink-0"></span>
                          <span>语料输入与消费者模型生成</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 三层理解框架 */}
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-zinc-300 mb-4 text-center">
                  三层消费者理解框架
                </h3>

                {/* 三层框架 - 网格布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">显性表达层</h4>
                    <p className="text-zinc-300 text-sm mb-3">直接记录消费者明确表达的偏好和态度</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">&ldquo;我喜欢环保产品&rdquo;</p>
                    </div>
                  </div>

                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">隐性逻辑层</h4>
                    <p className="text-zinc-300 text-sm mb-3">识别消费者潜在思维模式</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">风险规避倾向、从众心理</p>
                    </div>
                  </div>

                  <div className="bg-zinc-700/70 p-4 rounded-lg border-l-4 border-[#1bff1b]">
                    <h4 className="text-lg font-bold mb-2 text-zinc-300">情感关联层</h4>
                    <p className="text-zinc-300 text-sm mb-3">分析不同消费经历的情感色彩</p>
                    <div className="bg-zinc-800 p-2 rounded">
                      <p className="text-xs text-zinc-300 italic">正负面情感触发因素</p>
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
                方法论详解
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                深度访谈
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                技术实现
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  深度访谈方法：通过AI对消费者进行1-2小时的深入访谈，根据回答进行追问。
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">1-2小时</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">每次访谈时长</div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">5000字</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">
                    至2万字转录文本
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">1万</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">
                    真实消费者智能体
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-600 text-center shadow-sm">
                  <div className="text-lg font-bold mb-1 text-[#1bff1b]">85分</div>
                  <div className="text-xs text-zinc-300 opacity-70 font-medium">一致性评测</div>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="text-sm text-zinc-300 opacity-70 font-light">
                  生成平均五千到二万字的转录文本，形成消费者的
                  <span className="font-semibold">&ldquo;完整画像&rdquo;</span>
                </p>
              </div>

              {/* AI人设构建机制 */}
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-zinc-300 mb-2">AI人设构建机制</h3>
                <p className="text-zinc-300 leading-relaxed text-xs mb-2">
                  访谈的笔录，以及上述分析的维度，就形成了这个消费者的智能体。当被提问时，智能体会基于这个人在访谈中表达的观点、价值观和经历，以这个人的身份回答问题。
                </p>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  这种方法的优势在于保持了信息的完整性和上下文的连贯性，不需要预先决定哪些信息重要，而是让大语言模型从完整的访谈内容中自主识别和运用相关信息。
                  <span className="font-semibold text-zinc-300">在一致性的评测中达到85分。</span>
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
                深度访谈详解
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                四个关键维度
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                全面捕捉个体
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light text-center">
                  深度访谈涵盖了多个关键维度，旨在
                  <span className="font-semibold text-zinc-300">
                    全面捕捉个体的认知模式、价值体系和行为倾向
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">生活历程叙述</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    参与者被要求讲述自己的人生故事，包括重要的转折点、挫折经历和成就时刻。这部分内容帮助AI理解个体的成长轨迹和人格形成过程。
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">价值观探索</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    通过开放式问题深入挖掘参与者的核心价值观念，包括对家庭、工作、社会责任的看法，以及对成功、幸福、正义等概念的理解。
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">社会观点表达</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    收集参与者对当前社会议题的看法，包括政治倾向、社会问题的态度、对未来的期望等，这些内容为智能体在社会科学调查中的表现提供了基础。
                  </p>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-600 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">决策模式分析</h3>
                  <p className="text-zinc-300 opacity-70 text-xs leading-relaxed">
                    通过具体情境的讨论，了解参与者在面临选择时的思考过程、权衡因素和决策标准。
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
                智能体生态
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                覆盖多元化
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                消费群体
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  Atypica.AI目前已建立覆盖多元化消费群体的智能体生态，这个数字在持续增加。
                </p>
              </div>

              {/* 智能体统计 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-4xl font-bold mb-2 text-[#1bff1b]">30万</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">合成消费者智能体</h3>
                  <p className="text-zinc-300 text-xs">基于&ldquo;社交媒体&rdquo;数据构建</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-4xl font-bold mb-2 text-[#1bff1b]">1万</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-2">真实消费者智能体</h3>
                  <p className="text-zinc-300 text-xs">基于&ldquo;深度访谈&rdquo;数据构建</p>
                </div>
              </div>

              {/* 工作流程 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-zinc-800/70 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-zinc-300">智能调用流程</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">1</span>
                      </div>
                      <p className="text-xs text-zinc-300">用户提问</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">2</span>
                      </div>
                      <p className="text-xs text-zinc-300">判别商业问题</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">3</span>
                      </div>
                      <p className="text-xs text-zinc-300">智能调用相关智能体</p>
                    </div>
                    <div className="text-[#1bff1b] text-sm">→</div>
                    <div className="text-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 bg-[#1bff1b]">
                        <span className="text-zinc-900 font-bold text-xs">4</span>
                      </div>
                      <p className="text-xs text-zinc-300">模拟访谈</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1bff1b] text-zinc-900 p-3 rounded-lg text-center">
                <p className="text-sm font-semibold">实现大规模、多维度的消费者洞察收集</p>
              </div>
            </div>
          </div>
        );

      case 14:
        return (
          <div className="flex-1 flex flex-col px-16 py-6">
            <div className="mb-4">
              <div className="text-xs font-medium text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                应用场景分类
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300 mb-2">
                研究类型
              </h2>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-300">
                四大类别
              </h2>
              <div className="w-10 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <p className="text-sm text-zinc-300 leading-relaxed font-light">
                  研究类型分为
                  <span className="font-semibold text-zinc-300">测试、洞察、规划、创意</span>
                  四大类别。
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Testing</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">测试</h3>
                  <p className="text-xs text-zinc-300">产品功能测试、用户体验验证</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Insight</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">洞察</h3>
                  <p className="text-xs text-zinc-300">消费者行为分析、市场趋势研究</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Planning</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">规划</h3>
                  <p className="text-xs text-zinc-300">战略制定、产品路线图规划</p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600 text-center">
                  <div className="text-2xl font-bold text-zinc-300 mb-2">Creative</div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">创意</h3>
                  <p className="text-xs text-zinc-300">概念创新、内容创作</p>
                </div>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm/50 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-[#1bff1b] mb-3 text-center">
                  典型研究问题示例
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">测试类</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      罗技鼠标在小红书上选题，哪个会更受欢迎？
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">洞察类</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      LV上海门店的购物体验有什么反馈？
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">规划类</h4>
                    <p className="text-xs text-zinc-300 opacity-80">
                      INAH银那无醇葡萄饮市场营销策划
                    </p>
                  </div>
                  <div className="bg-zinc-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-300 mb-1">共创类</h4>
                    <p className="text-xs text-zinc-300 opacity-80">Mars脆香米新产品创意共创</p>
                  </div>
                </div>
                <div className="text-center">
                  <a
                    href="/featured-studies"
                    target="_blank"
                    className="inline-block bg-[#1bff1b] text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    查看更多研究案例
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
                第二部分：构建人设 · 适用场景
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                atypica.AI <span className="font-black">适用场景</span>
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              {/* 适用场景 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    早期探索阶段
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    快速验证产品概念，低成本初步探索
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    例：新产品创意共创、市场反应测试
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    跨文化洞察
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    全球市场进入策略，文化差异分析
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    例：本土化营销、文化敏感性测试
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    快速迭代测试
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    A/B测试预筛选，创意方案评估
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    例：营销信息优化、概念快速评估
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm p-4 rounded-xl border border-zinc-600">
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    难触达人群
                  </h3>
                  <p className="text-sm text-zinc-300 opacity-80 mb-2">
                    高净值人群、专业群体、偏远地区
                  </p>
                  <div className="text-xs text-zinc-300 opacity-60">
                    例：高端客户研究、专业市场分析
                  </div>
                </div>
              </div>

              {/* 局限性 */}
              <div className="bg-zinc-700 p-4 rounded-xl border border-zinc-600">
                <h3 className="text-base font-semibold text-zinc-300 mb-3">暂不适用场景</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> 复杂行为观察
                  </div>
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> 高风险重大决策
                  </div>
                  <div className="text-zinc-300 opacity-70">
                    <span className="text-red-400">•</span> 深度情感洞察
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
                第三部分：技术演进
              </div>
              <h2 className="text-5xl md:text-6xl font-light tracking-tight text-zinc-300 mb-6">
                产品想法
              </h2>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-300">来源</h2>
              <div className="w-16 h-1 bg-[#1bff1b] mt-6"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-16">
                <p className="text-xl text-zinc-300 opacity-70 font-light max-w-3xl mx-auto">
                  atypica.AI技术演进的四个关键阶段
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">理论基础</h3>
                  <p className="text-sm text-zinc-300 opacity-70">斯坦福小镇研究</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">工具能力</h3>
                  <p className="text-sm text-zinc-300 opacity-70">OpenAI + Claude</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">推理架构</h3>
                  <p className="text-sm text-zinc-300 opacity-70">DeepSeek R1</p>
                </div>

                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-600 text-center">
                  <div className="w-12 h-12 bg-[#1bff1b] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-zinc-900 font-bold text-lg">4</span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">交互形态</h3>
                  <p className="text-sm text-zinc-300 opacity-70">Cursor, Manus等</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 17:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                第三部分：技术演进 - 第一阶段
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                理论基础：斯坦福小镇研究
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2023年：多智能体互动概念
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  斯坦福小镇研究《Generative Agents: Interactive Simulacra of Human
                  Behavior》首次展示了多智能体互动的可能性，但未深入展示智能体交互机制。
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">2024年：商业应用验证</h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  《Generative Agent Simulations of 1,000
                  People》成功模拟了1000个随机美国人的行为模式，智能体与真人行为一致性高达85%以上，验证了智能体模拟真实人类行为的商业潜力。
                </p>
                <div className="bg-zinc-700 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-[#1bff1b]">85%以上行为一致性</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 18:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                第三部分：技术演进 - 第二阶段
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                工具能力突破
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2023年12月 - OpenAI GPT-4 Function Calling
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300">
                  让模型能够调用外部工具，开创了全新的应用场景，使模型不再局限于对话框内的交互。
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2024年11月 - Claude MCP协议
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  让模型主动与外部世界建立连接，能够浏览社交媒体、自主发掘内容、筛选热点话题、分析内容表现和用户反馈。
                </p>
                <div className="bg-zinc-700 p-3 rounded-lg">
                  <p className="text-sm text-zinc-300 font-medium">
                    ✅ 使atypica.AI的社交媒体数据收集成为可能
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
                第三部分：技术演进 - 第三阶段
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                推理架构设计
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2025年2月 - DeepSeek R1透明推理
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  展示了透明的推理过程，为在基座模型基础上设计推理架构提供了方向。
                </p>
              </div>

              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-lg font-semibold text-zinc-300 mb-4">
                  发散vs收敛：商业问题的特殊性
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-6">
                  与针对客观世界/科学问题强调&ldquo;收敛&rdquo;不同，主观世界/商业问题需要强调&ldquo;发散&rdquo;
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">学习过去案例</h4>
                    <p className="text-xs text-zinc-300 opacity-70">汲取历史智慧</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">灵光乍现</h4>
                    <p className="text-xs text-zinc-300 opacity-70">创新性突破</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">反馈质量</h4>
                    <p className="text-xs text-zinc-300 opacity-70">高质量优化</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-bold mb-2 text-zinc-300">迭代数量</h4>
                    <p className="text-xs text-zinc-300 opacity-70">多轮完善</p>
                  </div>
                </div>

                <div className="bg-zinc-900 border-2 border-[#1bff1b] text-white p-4 rounded-lg text-center">
                  <p className="text-base font-semibold text-[#1bff1b]">
                    基于四个维度开发&ldquo;Creative Reasoning&rdquo;长推理架构
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
                第三部分：技术演进 - 第四阶段
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                产品交互形态创新
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-800/70 backdrop-blur-sm p-6 rounded-xl border border-zinc-600">
                <h3 className="text-xl font-semibold text-[#1bff1b] mb-4">
                  2025年3月 - 多智能体产品形态
                </h3>
                <p className="text-base font-light leading-relaxed text-zinc-300 mb-4">
                  Cursor、Manus、Claude
                  Artifacts、Devin等产品的发布，展示了多智能体产品设计的新可能性。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Cursor</h4>
                    <p className="text-xs text-zinc-300 opacity-70">AI编程助手</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Manus</h4>
                    <p className="text-xs text-zinc-300 opacity-70">工作过程可视化</p>
                  </div>
                  <div className="bg-zinc-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Devin</h4>
                    <p className="text-xs text-zinc-300 opacity-70">AI软件工程师</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border-2 border-[#1bff1b] text-white p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-3 text-[#1bff1b]">
                  关键创新：工作过程透明化
                </h3>
                <p className="text-sm mb-3">
                  Manus在智能体工作过程表达和回放功能上的创新尤为突出，让用户能够看到智能体的工作过程。
                </p>
                <p className="text-sm font-medium mb-3">✅ 提升用户对AI结果的信任度和同理心</p>
                <p className="text-sm font-medium text-[#1bff1b]">
                  💡 为atypica.AI的研究过程回放功能提供设计灵感
                </p>
              </div>
            </div>
          </div>
        );

      case 21:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-10">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                第四部分：结尾
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                重新定义
              </h1>
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-300">
                商业调研的价值
              </h1>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-6 rounded-xl border">
                  <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                    从依赖历史数据的
                    <span className="font-medium text-zinc-300">被动分析</span>
                    ，转向基于智能体的
                    <span className="font-medium text-zinc-300">主动模拟</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/70 backdrop-blur-sm/50 border-zinc-600 p-4 rounded-xl border">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">传统模式</h3>
                    <p className="text-sm font-light text-zinc-300 opacity-60">先研究，再决策</p>
                  </div>
                  <div className="bg-zinc-700 border-zinc-600 p-4 rounded-xl border">
                    <h3 className="text-sm font-medium text-zinc-300 mb-2">AI驱动模式</h3>
                    <p className="text-sm font-light text-zinc-300">边研究，边决策，边执行</p>
                  </div>
                </div>

                <div className="bg-[#1bff1b] text-zinc-900 p-6 rounded-xl text-center">
                  <p className="text-base font-medium mb-2">
                    调研的价值不在于产生报告，而在于驱动有效行动
                  </p>
                  <p className="text-sm font-light opacity-80">
                    从&ldquo;先研究，再决策&rdquo;到&ldquo;边研究，边决策，边执行&rdquo;
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
              <h2 className="text-2xl font-bold text-zinc-300 opacity-70">页面不存在</h2>
            </div>
          </div>
        );
    }
  };

  return (
    <FitToViewport className="bg-[#0a0a0a] relative flex flex-col items-center justify-center">
      {/* Main slide content */}
      <div className="p-4" style={deckStyles}>
        {/* PPT Container with responsive aspect ratio */}
        <div
          className="w-full max-w-6xl aspect-video bg-[#121212] relative flex flex-col shadow-2xl border border-zinc-600"
          key={currentSlide}
        >
          {/* 演讲稿提示按钮 - 只有 Tezign 用户可见 */}
          {showPresenterNotes && slideNotes[currentSlide] && (
            <div className="absolute top-4 right-4 z-10 group">
              <div className="relative">
                <button className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-[#1bff1b] rounded-full flex items-center justify-center text-xs font-medium shadow-sm transition-all duration-200 hover:scale-105 border border-zinc-600">
                  ?
                </button>

                {/* Hover提示框 */}
                <div className="absolute top-9 right-0 w-80 bg-zinc-800/95 backdrop-blur-sm border border-zinc-600 rounded-lg shadow-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20">
                  <div className="text-xs font-light text-[#1bff1b] mb-2 uppercase tracking-wide">
                    演讲稿 {currentSlide + 1}/{totalSlides}
                  </div>
                  <div className="text-sm font-light text-zinc-300 leading-relaxed max-h-32 overflow-y-auto">
                    {slideNotes[currentSlide]}
                  </div>
                  {/* 小箭头 */}
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-zinc-800/95 border-t border-l border-zinc-600 rotate-45"></div>
                </div>
              </div>
            </div>
          )}

          {renderSlide()}
        </div>
      </div>

      {/* Navigation buttons */}
      {isMobile && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-4 max-sm:scale-75">
          <button
            onClick={goToPrevSlide}
            disabled={currentSlide === 0}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              "bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 shadow-xl",
              currentSlide === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-zinc-700 hover:scale-110 hover:border-[#1bff1b]",
            )}
          >
            <ChevronLeft className="w-5 h-5 text-zinc-300" />
          </button>
          <button
            onClick={goToNextSlide}
            disabled={currentSlide === totalSlides - 1}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              "bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 shadow-xl",
              currentSlide === totalSlides - 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-zinc-700 hover:scale-110 hover:border-[#1bff1b]",
            )}
          >
            <ChevronRight className="w-5 h-5 text-zinc-300" />
          </button>
        </div>
      )}

      {/* Controls - minimalist bottom indicators */}
      <div
        className={cn(
          "absolute bottom-6 left-1/2 transform -translate-x-1/2 max-sm:scale-75",
          "flex items-center gap-2 bg-zinc-800/90 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-600 shadow-xl",
        )}
      >
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

      {/* Keyboard hints - minimalist top left */}
      <div className="absolute top-6 left-6 bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-600 shadow-xl">
        <div className="text-xs font-light text-zinc-300">← → 键切换</div>
      </div>

      {/* Slide counter - minimalist top right */}
      <div className="absolute top-6 right-6 bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-600 shadow-xl">
        <div className="text-xs font-light text-zinc-300">
          {currentSlide + 1} / {totalSlides}
        </div>
      </div>
    </FitToViewport>
  );
}
