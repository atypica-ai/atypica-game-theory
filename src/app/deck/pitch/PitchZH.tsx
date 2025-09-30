"use client";
import { useDeckScale } from "@/app/deck/hooks/useDeckScale";
import { cn, useDevice } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const totalSlides = 12;

// 演讲稿内容映射
const slideNotes: { [key: number]: string } = {
  0: "欢迎来到Atypica项目介绍。我们正在用AI技术重写千亿美元的市场研究行业，从传统的问卷调研转向智能化的消费者洞察分析。",
  1: "市场研究行业正面临重大转折。2025年Gartner股价暴跌30%，McKinsey年度增长仅2%，传统咨询模式面临挑战，而AI原生研究正在兴起。",
  2: "Atypica通过四个发展阶段的演进，从传统咨询到AI原生研究，在成本、周期和准确度上实现了显著优势，特别是AI模拟用户功能。",
  3: "Atypica拥有两大核心能力：AI原生研究和AI模拟用户。我们的目标是让市场研究成本降低100倍，速度提升100倍，覆盖用户群体增加100倍。",
  4: "我们构建了三层AI体系：从答案到主观世界。包括AI人设数据层、AI访谈工作层和AI研究分析层，形成完整的研究生态。",
  5: "AI人设是我们的核心技术，基于不同数据源构建消费者模型。从公共社交媒体到深度访谈，我们提供了多层次的服务选择。",
  6: "AI访谈功能让人与AI直接对话，支持多模态交互。AI可以主动发起访谈、自动追问，并组织虚拟焦点小组进行深度研究。",
  7: "AI研究功能提供高质量科学整理、跨学科分析模型和自动化生成报告，让研究从问卷项目转为持续分析的Always-on模式。",
  8: "有了Atypica，市场研究将实现三个100倍的提升：成本降低、速度提升和用户覆盖增加，让每个决策都能获得实时的消费者视角。",
  9: "我们的产品适用于不同规模的企业和个人用户，从电子消费品公司到个人创作者，都能找到合适的使用方式。",
  10: "基于5000名用户的真实数据，创业者/自由职业占比最高，其次是咨询/营销行业，显示了广泛的市场需求。",
  11: "Atypica代表了从静态分析到动态执行的转变，让研究不再只是产生报告，而是驱动有效行动，实现边研究、边决策、边执行的敏捷模式。",
};

export function PitchZH({ showPresenterNotes = false }: { showPresenterNotes?: boolean }) {
  const [currentSlide, setCurrentSlide] = useState(0);
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

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-center items-center text-center px-12 md:px-16 py-10 relative overflow-hidden">
            {/* 背景装饰 */}
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

            {/* 主标题 */}
            <div className="mb-8 relative z-10">
              <h1 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-2">
                Atypica
              </h1>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.35)]">
                用AI重写千亿美元的市场研究
              </h1>
            </div>

            {/* 副标题 */}
            <div className="mb-8 relative z-10">
              <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 opacity-80 mb-4">
                从传统调研到智能洞察的革命性转变
              </p>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 描述文字 */}
            <div className="max-w-4xl bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-lg p-8 relative z-10">
              <div className="border-l-4 border-[#1bff1b] pl-6">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4">
                  市场研究的核心问题从未改变：消费者在想什么？
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 opacity-80">
                  全球企业为此每年投入超过1400亿美元，催生了McKinsey、Ipsos等咨询巨头，和Qualtrics、Medallia等软件公司。
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-8 relative">
            {/* 背景装饰 */}
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

            {/* 标题 */}
            <div className="mb-10 relative z-10">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                行业现状
              </div>
              <h2 className="text-4xl md:text-6xl font-light tracking-tight text-zinc-300 mb-3">
                然而，2025年，行业来到
              </h2>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                一个转折点
              </h2>
              <div className="w-16 h-0.5 mt-6 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10 space-y-8">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-10 rounded-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-4 h-4 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 mb-3">
                      <span className="font-semibold">8月5日Gartner股价暴跌30%</span>
                      ，创99年以来最大跌幅
                    </p>
                    <p className="text-base text-zinc-300 opacity-70">
                      ——资本市场公开承认：传统模式面临结构性挑战
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 mb-3">
                      <span className="font-semibold">McKinsey公布年度增长仅2%</span>，两年内减员10%
                    </p>
                    <p className="text-base text-zinc-300 opacity-70">
                      ——脑力密集型、人工驱动的研究模式增长受阻
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-8 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-xl md:text-2xl font-light leading-relaxed text-zinc-300 mb-4">
                  这些并非偶然波动，而是范式松动的征兆。
                </p>
                <p className="text-lg font-medium text-[#1bff1b]">
                  <span className="font-bold">Atypica.AI就诞生在这个关口！</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="h-full flex flex-col px-12 md:px-16 py-8">
            {/* 标题 */}
            <div className="mb-8">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                范式演进
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300">
                四个阶段，<span className="font-medium">一张表看懂差异</span>
              </h2>
              <div className="w-12 h-0.5 mt-4 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl mb-8">
                <p className="text-base md:text-lg text-zinc-300 leading-relaxed font-light text-center">
                  投资机构<span className="font-semibold text-[#1bff1b]">A16Z</span>
                  ，把市场研究的范式演进分为四个阶段：
                </p>
              </div>

              {/* 演进表格 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/70 backdrop-blur-sm">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          范式
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          代表公司
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          典型方法
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          周期
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          成本
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-5 py-4 text-base font-medium text-zinc-300">传统咨询</td>
                        <td className="px-5 py-4 text-base text-zinc-300">
                          McKinsey/BCG/Ipsos/Gartner
                        </td>
                        <td className="px-5 py-4 text-base text-zinc-300">专家判断+人工分析</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">按季度</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">百万美</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-5 py-4 text-base font-medium text-zinc-300">
                          软件化研究
                        </td>
                        <td className="px-5 py-4 text-base text-zinc-300">Qualtrics/Medallia</td>
                        <td className="px-5 py-4 text-base text-zinc-300">
                          在线问卷、量表、仪表盘
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">按周</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">十万美</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-5 py-4 text-base font-semibold text-[#1bff1b]">
                          AI原生研究
                        </td>
                        <td className="px-5 py-4 text-base text-[#1bff1b]">Atypica</td>
                        <td className="px-5 py-4 text-base text-[#1bff1b]">
                          LLM主持访谈、转写、暨意/模式分析
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[#1bff1b]">按天</td>
                        <td className="px-4 py-3 text-center text-sm text-[#1bff1b]">数百-千</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/20">
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">AI模拟用户</td>
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">Atypica</td>
                        <td className="px-5 py-4 text-base font-bold text-[#1bff1b]">
                          多智能体模拟行为与决策、虚拟焦点小组
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[#1bff1b]">
                          按小时
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[#1bff1b]">
                          数十-百
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
            {/* 背景装饰 */}
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

            {/* 标题 */}
            <div className="mb-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                Atypica
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_15px_rgba(27,255,27,0.25)]">
                把研究变成商业基础设施
              </h2>
              <div className="w-16 h-0.5 mt-4 bg-gradient-to-r from-[#1bff1b] to-transparent shadow-[0_0_8px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto relative z-10 space-y-8">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 mb-4 text-center">
                  企业的经营节奏已经切换：
                  <span className="font-semibold text-[#1bff1b]">
                    营销以&ldquo;天&rdquo;为单位，新品研发以&ldquo;月&rdquo;为单位；
                  </span>
                </p>
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  研究与洞察不能再以
                  <span className="font-semibold text-red-400">&ldquo;年&rdquo;</span>为节拍！
                </p>
              </div>

              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-6 rounded-xl text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <h3 className="text-xl font-bold text-[#1bff1b] mb-4">Atypica 具有两大能力：</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                    <h4 className="text-lg font-semibold text-[#1bff1b] mb-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                      AI原生研究
                    </h4>
                    <p className="text-sm text-zinc-300">
                      用AI自动化研究流程，更高效、更快速、更大规模。
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                    <h4 className="text-lg font-semibold text-[#1bff1b] mb-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                      AI模拟用户
                    </h4>
                    <p className="text-sm text-zinc-300">
                      用多智能体建模用户的行为、价值观、情绪与决策，让&ldquo;虚拟焦点小组&rdquo;持续在线。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border-2 border-[#1bff1b] p-6 rounded-xl text-center">
                <h3 className="text-2xl font-bold text-[#1bff1b] mb-3">Atypica 的价值主张：</h3>
                <p className="text-xl font-light text-zinc-300">
                  当AI让市场研究成本<span className="font-bold text-[#1bff1b]">降低100倍</span>
                  、速度<span className="font-bold text-[#1bff1b]">提升100倍</span>、覆盖用户群体
                  <span className="font-bold text-[#1bff1b]">增加100倍</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            {/* 标题 */}
            <div className="mb-6">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                技术架构
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                构建三层<span className="font-medium">AI体系</span>
              </h2>
              <h2 className="text-xl md:text-2xl font-light tracking-tight text-zinc-300 opacity-80 mt-1">
                从&ldquo;答案&rdquo;到&ldquo;主观世界&rdquo;
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            {/* 架构图 */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="max-w-6xl mx-auto space-y-4">
                {/* 第三层 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">3. 分析洞察层</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI研究 / AI Research</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">高质量科学整理</div>
                      <div className="text-xs text-zinc-400">全量记录文本、情绪、观点演进</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">跨学科分析模型</div>
                      <div className="text-xs text-zinc-400">内置多场景专业研究分析模型</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">自动化生成报告</div>
                      <div className="text-xs text-zinc-400">AI总结观点洞察+可下载/转发/回放</div>
                    </div>
                  </div>
                </div>

                {/* 箭头 */}
                <div className="text-center py-2">
                  <div className="text-[#1bff1b] text-2xl">↑</div>
                </div>

                {/* 第二层 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">2. 工作流程层</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI访谈 / AI Interview</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">人访谈AI</div>
                      <div className="text-xs text-zinc-400">
                        直接与AI人设文字/多模态对话，分级获得调研
                      </div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">AI访谈人</div>
                      <div className="text-xs text-zinc-400">
                        AI开发主持多人访谈，自动追问与收敛
                      </div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">AI访谈AI</div>
                      <div className="text-xs text-zinc-400">
                        AI组织虚拟焦点小组，定期运行、自动总结
                      </div>
                    </div>
                  </div>
                </div>

                {/* 箭头 */}
                <div className="text-center py-2">
                  <div className="text-[#1bff1b] text-2xl">↑</div>
                </div>

                {/* 第一层 */}
                <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex items-center gap-8">
                  <div className="flex-shrink-0 w-56">
                    <div className="text-sm text-zinc-400 mb-1">1. 用户数据层</div>
                    <h3 className="text-lg font-bold text-[#1bff1b]">AI人设 / AI Persona</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 1: 公共社交媒体
                      </div>
                      <div className="text-xs text-zinc-400">75-79% 准确度，10-15分钟</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 2: 通用深度访谈
                      </div>
                      <div className="text-xs text-zinc-400">81-85% 准确度，1-2小时</div>
                    </div>
                    <div className="bg-zinc-700 p-4 rounded-lg">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">
                        Tier 3: 企业私有资料
                      </div>
                      <div className="text-xs text-zinc-400">88%以上准确度，1-2小时</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部说明 - 单独放在外面增加间距 */}
              <div className="max-w-6xl mx-auto mt-8">
                <div className="bg-zinc-900 border-2 border-[#1bff1b] p-4 rounded-xl text-center">
                  <p className="text-sm text-[#1bff1b] font-medium">
                    传统问卷记录&ldquo;答案&rdquo;，Atypica建模&ldquo;主观世界&rdquo;。
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            {/* 标题 */}
            <div className="mb-4">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI人设详解
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                基于不同数据源的
              </h2>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-300">
                主观世界建模法
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-5 rounded-xl">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center mb-3">
                  Atypica 基于此提出【
                  <span className="font-bold text-[#1bff1b]">主观世界建模法</span>
                  】，用AI建立三层人设：
                </p>
              </div>

              {/* AI Persona 详细表格 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="bg-zinc-700/50 px-4 py-3 border-b border-zinc-600">
                  <h3 className="text-lg font-semibold text-[#1bff1b] text-center">
                    AI Persona 数据来源与准确度
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/30">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          层级
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                          数据来源
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          准确度
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          构建时间
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-300">
                          成本
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">Tier 1</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">公共社交媒体</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">75-79%</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">10-15分钟</td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-300">1-10元</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">Tier 2</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">通用深度访谈</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">81-85%</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">1-2小时</td>
                        <td className="px-3 py-2 text-center text-xs text-zinc-300">10-50元</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-4 py-3 text-sm font-bold text-[#1bff1b]">Tier 3</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1bff1b]">企业私有资料</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">
                          88%以上
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">
                          1-2小时
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#1bff1b]">
                          10-100元
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Tier 1/2 公有人设库
                  </h4>
                  <p className="text-xs text-zinc-300 opacity-80">
                    （已建40万+10万档），可即取即用；
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mr-2"></span>
                    Tier 3 私有人设
                  </h4>
                  <p className="text-xs text-zinc-300 opacity-80">
                    沉淀为企业私有资产，可持续访谈与学习。
                  </p>
                </div>
              </div>

              {/* 科研证据 */}
              <div className="bg-zinc-900 border border-[#1bff1b] p-3 rounded-xl">
                <h4 className="text-sm font-semibold text-[#1bff1b] mb-2 text-center">
                  科研证据为AI模拟人提供了坚实基础：
                </h4>
                <div className="space-y-1 text-xs text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></span>
                    <span>
                      <span className="font-semibold text-[#1bff1b]">
                        Generative Agents: Interactive Simulacra of Human Behavior
                      </span>
                      (2023，斯坦福大学等)：记忆+反思+规划机制可让AI呈现接近人类的行为。
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></span>
                    <span>
                      <span className="font-semibold text-[#1bff1b]">
                        Generative Agent Simulations of 1000 People
                      </span>
                      (2024，斯坦福大学等等)：85%准确率模拟真实调研反应，为消费者数字孪生提供验证。
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></span>
                    <span>
                      <span className="font-semibold text-[#1bff1b]">
                        Persona vectors: Monitoring and controlling character traits in language
                        models
                      </span>
                      (2025，Anthropic)：揭示模型如何表征与控制性格特征。
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="h-full flex flex-col px-8 md:px-12 py-6">
            {/* 标题 */}
            <div className="mb-6">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI访谈功能
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                让人与AI直接
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                对话交流
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {/* 三种访谈模式 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">人→AI</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">人访谈AI</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    直接与AI人设文字/多模态对话，分级获得调研；
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">AI→人</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">AI访谈人</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    AI并发主持多人访谈，自动追问与收敛；
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl text-center">
                  <div className="w-12 h-12 bg-[#1bff1b]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-[#1bff1b]">AI↔AI</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1bff1b] mb-2">AI访谈AI</h3>
                  <p className="text-sm text-zinc-300 opacity-80">
                    AI组织虚拟焦点小组，定期运行、自动总结，形成&ldquo;永续研究网络&rdquo;。
                  </p>
                </div>
              </div>

              {/* 访谈流程示意图 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 p-4">
                <h3 className="text-lg font-semibold text-[#1bff1b] mb-4 text-center">
                  AI访谈工作流程
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">1</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">问题澄清</p>
                    <p className="text-xs text-zinc-400">理解研究意图</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">2</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">智能匹配</p>
                    <p className="text-xs text-zinc-400">选择合适AI人设</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">3</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">模拟访谈</p>
                    <p className="text-xs text-zinc-400">深度对话交流</p>
                  </div>
                  <div className="text-[#1bff1b] text-lg">→</div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#1bff1b]">
                      <span className="text-zinc-900 font-bold text-sm">4</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 font-medium">洞察整理</p>
                    <p className="text-xs text-zinc-400">自动生成报告</p>
                  </div>
                </div>
              </div>

              {/* 特色功能 - 采用左右布局 */}
              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-4 rounded-xl">
                <div className="flex items-center gap-8">
                  <div className="flex-shrink-0 w-24">
                    <h3 className="text-base font-semibold text-[#1bff1b]">核心优势</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">多模态支持：</span>
                        <span className="text-zinc-300 opacity-80">
                          文字、语音、图像等多种交互方式
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">智能追问：</span>
                        <span className="text-zinc-300 opacity-80">根据回答自动生成深入问题</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">虚拟焦点小组：</span>
                        <span className="text-zinc-300 opacity-80">多个AI人设同时参与讨论</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#1bff1b] rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-zinc-300">24/7可用：</span>
                        <span className="text-zinc-300 opacity-80">随时随地进行研究访谈</span>
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
            {/* 标题 */}
            <div className="mb-3">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                AI研究功能
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-300">
                从数据收集到
              </h2>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-zinc-300">
                洞察生成
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-3">
              {/* 三大核心功能 - 调整布局，emoji放在标题左边 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">📊</span>
                    高质量科学整理
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    全量记录文本、情绪、观点演进；
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">🔬</span>
                    跨学科分析模型
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    按问题自动/手动选取分析模型，得出结果与策略建议；（内置分析模型见附录1）
                  </p>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1bff1b] mb-2 flex items-center justify-center">
                    <span className="text-base mr-2">📄</span>
                    自动化生成报告
                  </h3>
                  <p className="text-xs text-zinc-300 opacity-80 text-center">
                    AI总结观点洞察+可下载/转发/回放的研究资产。
                  </p>
                </div>
              </div>

              {/* 功能展示区域 - 缩小padding和字体 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 p-3">
                <h3 className="text-base font-semibold text-[#1bff1b] mb-3 text-center">
                  AI研究报告示例
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 左侧：报告预览 */}
                  <div className="flex flex-col h-full">
                    <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg p-2 flex-1 flex flex-col">
                      <div className="bg-white rounded-lg p-2 mb-2 flex-1">
                        <div className="text-black text-xs space-y-1">
                          <div className="font-bold text-xs border-b pb-1 mb-1">
                            研究报告：LV上海门店购物体验
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold">核心发现</div>
                            <div className="text-xs">• 服务质量获得高度认可</div>
                            <div className="text-xs">• 排队时间是主要痛点</div>
                            <div className="text-xs">• 产品展示需要优化</div>
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold">消费者洞察</div>
                            <div className="text-xs">• 期待更个性化的服务体验</div>
                            <div className="text-xs">• 希望有更舒适的试用环境</div>
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold">改进建议</div>
                            <div className="text-xs">• 引入预约制度</div>
                            <div className="text-xs">• 优化店面布局</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 bg-[#1bff1b] text-zinc-900 px-2 py-0.5 rounded-full text-xs font-medium">
                          <span className="text-xs">📊</span>
                          <span>完整报告</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：生成过程和统计数据 - 调整高度对齐 */}
                  <div className="flex flex-col h-full gap-2">
                    <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg p-2 flex-1">
                      <h4 className="text-xs font-semibold text-zinc-300 mb-1">生成过程</h4>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-zinc-300 text-xs">数据收集完成</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="text-zinc-300 text-xs">情感分析完成</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                          <span className="text-zinc-300 text-xs">跨学科模型分析中...</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                          <span className="text-zinc-400 text-xs">报告生成等待中</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg p-2 flex-1">
                      <h4 className="text-xs font-semibold text-zinc-300 mb-1">统计数据</h4>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-300 text-xs">访谈对象：</span>
                          <span className="text-[#1bff1b] text-xs">47位用户</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-300 text-xs">数据点：</span>
                          <span className="text-[#1bff1b] text-xs">1,240个</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-300 text-xs">分析模型：</span>
                          <span className="text-[#1bff1b] text-xs">客户体验分析</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-300 text-xs">置信度：</span>
                          <span className="text-[#1bff1b] text-xs">87%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Always-on 模式 */}
              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] p-3 rounded-xl text-center">
                <h3 className="text-base font-bold text-[#1bff1b] mb-2">Always-on 研究模式</h3>
                <p className="text-xs text-zinc-300 mb-2">
                  研究由&ldquo;问卷项目&rdquo;转为&ldquo;持续分析&rdquo;（Always-on），让每个决策都能实时获得更全面的用户视角。
                </p>
                <div className="flex gap-2 justify-center text-xs">
                  <div className="bg-zinc-800/50 px-2 py-1 rounded">
                    <span className="font-semibold text-zinc-300">传统模式：</span>
                    <span className="text-zinc-300 opacity-80">项目制、周期性</span>
                  </div>
                  <div className="bg-zinc-800/50 px-2 py-1 rounded">
                    <span className="font-semibold text-[#1bff1b]">Always-on：</span>
                    <span className="text-zinc-300">持续、实时、智能</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-8 relative">
            {/* 背景装饰 */}
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

            {/* 主标题 */}
            <div className="mb-6 relative z-10 text-center">
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                有了Atypica
              </h1>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_25px_rgba(27,255,27,0.3)]">
                会怎样？
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto mt-4 shadow-[0_0_10px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 flex flex-col justify-center space-y-6 max-w-5xl mx-auto w-full relative z-10">
              {/* 三个100倍 */}
              <div className="text-lg md:text-xl font-light text-zinc-300 text-center mb-2">
                当AI让市场研究成本<span className="font-bold text-[#1bff1b]">降低100倍</span>、速度
                <span className="font-bold text-[#1bff1b]">提升100倍</span>、覆盖用户群体
                <span className="font-bold text-[#1bff1b]">增加100倍</span>，那么：
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                  <div className="flex items-start mb-3">
                    <span className="text-2xl mr-3 mt-1">🎯</span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1bff1b] mb-2">每一个经营决策</h3>
                      <p className="text-base text-zinc-300 opacity-90 leading-relaxed">
                        都能实时邀请更全面的用户视角；
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-6 rounded-xl">
                  <div className="flex items-start mb-3">
                    <span className="text-2xl mr-3 mt-1">⚡</span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1bff1b] mb-2">
                        从项目到基础设施
                      </h3>
                      <p className="text-base text-zinc-300 opacity-90 leading-relaxed">
                        付费模式从&ldquo;任务/工时&rdquo;转向&ldquo;订阅式基础设施&rdquo;——像云计算一样，让研究和洞察变成水电煤。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 核心价值主张 */}
              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] rounded-xl p-6 shadow-[0_0_25px_rgba(27,255,27,0.15)]">
                <p className="text-base md:text-lg font-light leading-relaxed text-zinc-300 text-center">
                  但请记住：当数据和研究变得更经济，
                  <span className="font-bold text-[#1bff1b]">
                    真正有价值的是&ldquo;智慧&rdquo;与&ldquo;好猜想&rdquo;
                  </span>
                  。提出好问题，建立可验证假设，才是下一阶段的竞争壁垒。
                </p>
              </div>

              {/* 对比模式 */}
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg text-center">
                  <div className="text-base font-semibold text-zinc-400 mb-2">传统模式</div>
                  <div className="text-sm text-zinc-300 opacity-70">先研究，再决策</div>
                </div>
                <div className="bg-zinc-800/50 border border-[#1bff1b]/50 p-4 rounded-lg text-center">
                  <div className="text-base font-semibold text-[#1bff1b] mb-2">Always-on 模式</div>
                  <div className="text-sm text-[#1bff1b]">边研究，边决策，边执行</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-8">
            {/* 标题 */}
            <div className="mb-6">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-2">
                使用场景
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                谁在使用
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                Atypica？
              </h2>
              <div className="w-12 h-0.5 mt-3 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {/* 使用场景表格 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 overflow-hidden shadow-lg">
                <div className="bg-zinc-700/50 px-4 py-2.5 border-b border-zinc-600">
                  <h3 className="text-lg font-semibold text-[#1bff1b] text-center">适用场景详解</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-700/30">
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">
                          客户
                        </th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">
                          客户规模
                        </th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">
                          使用方式
                        </th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-zinc-300">
                          典型场景
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">
                          某电子消费品公司
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">大</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          把用户调研接体验化【AI人设】交互式学习，随时提问
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">新品发布前反馈</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">
                          某快消品公司
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">超大</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          用【AI研究】分析小红书、计算VOC
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">营销效果监测</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">某连锁餐饮</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">大</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          用【AI访谈】3000位真实用户体验
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">2025年战略规划</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">
                          某出海新品牌
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">小</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          用【AI研究】模拟巴西、智利、网红运营用户
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">跨文化产品适配</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">某B2B公司</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">中</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">用【AI人设】做销售剧本</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">销售培训优化</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">某美妆品牌</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">超大</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          用【AI研究】每日跟踪竞品文案与互动
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">竞品分析监控</td>
                      </tr>
                      <tr className="border-t border-zinc-600">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-300">某咨询专家</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">个人</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          用【AI研究】做项目前调研
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">专业服务支持</td>
                      </tr>
                      <tr className="border-t border-zinc-600 bg-[#1bff1b]/10">
                        <td className="px-4 py-3 text-sm font-medium text-[#1bff1b]">
                          某高学院教授
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">个人</td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">
                          用【AI研究】在课堂实时案例
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1bff1b]">学术研究教学</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 工具统计 */}
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-lg text-center">
                <p className="text-sm text-zinc-300">
                  <span className="font-semibold text-zinc-300">
                    （Atypica使用的具体统计附录2）
                  </span>
                </p>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="h-full flex flex-col px-10 md:px-14 py-6">
            {/* 标题 */}
            <div className="mb-4">
              <div className="text-xs font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-1">
                用户数据洞察
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-zinc-300">
                5000名用户的
              </h2>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-300">
                行业分布
              </h2>
              <div className="w-12 h-0.5 mt-2 bg-[#1bff1b]"></div>
            </div>

            {/* 内容 */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-3 rounded-xl text-center">
                <p className="text-sm text-zinc-300">
                  样本量：抽样调研<span className="font-semibold text-[#1bff1b]">5000</span>
                  份真实的用户研究报告
                </p>
              </div>

              {/* 行业分布图表 */}
              <div className="bg-zinc-800 rounded-xl border border-zinc-600 p-4">
                <h3 className="text-lg font-semibold text-[#1bff1b] mb-4 text-center">
                  行业分布 / Industry
                </h3>

                <div className="space-y-2">
                  {[
                    { label: "创业者/自由职业", value: 24.8, color: "#1bff1b" },
                    { label: "咨询/营销行业", value: 17.4, color: "#1bff1b" },
                    { label: "跨境电商", value: 12.9, color: "#1bff1b" },
                    { label: "媒体/内容行业", value: 11.4, color: "#1bff1b" },
                    { label: "互联网/科技行业", value: 11.1, color: "#1bff1b" },
                    { label: "快消/零售行业", value: 9.0, color: "#1bff1b" },
                    { label: "教育培训行业", value: 7.4, color: "#1bff1b" },
                    { label: "服务业", value: 6.7, color: "#1bff1b" },
                    { label: "金融投资行业", value: 4.6, color: "#1bff1b" },
                    { label: "制造业", value: 4.1, color: "#1bff1b" },
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

              {/* 核心洞察 - 精简版 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2">主要用户群体特征</h4>
                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>创新驱动</strong>：创业者和自由职业者占比最高（24.8%）
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>专业导向</strong>：咨询营销专业人士紧随其后（17.4%）
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>数字化转型</strong>：电商、科技、内容行业占比显著
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-[#1bff1b] mb-2">市场需求趋势</h4>
                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>敏捷决策</strong>：快速变化行业更需要实时洞察
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>成本敏感</strong>：中小企业和个人用户需要经济方案
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1 flex-shrink-0"></div>
                      <span>
                        <strong>专业化</strong>：不同行业需要定制化的研究方法
                      </span>
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
            {/* 标题 */}
            <div className="mb-8 text-center">
              <div className="text-sm font-light text-zinc-300 opacity-60 uppercase tracking-wider mb-3">
                未来展望
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-300 mb-2">
                欢迎使用
              </h1>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1bff1b] shadow-[0_0_20px_rgba(27,255,27,0.25)]">
                Atypica
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#1bff1b] to-transparent mx-auto mt-6 shadow-[0_0_10px_rgba(27,255,27,0.35)]"></div>
            </div>

            {/* 内容区域 */}
            <div className="max-w-5xl mx-auto w-full space-y-6">
              {/* 核心理念 */}
              <div className="bg-zinc-800/70 backdrop-blur-sm border border-zinc-600 rounded-xl p-6">
                <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 text-center mb-3">
                  让研究进入 <span className="font-bold text-[#1bff1b]">Always-on</span> 模式，
                </p>
                <p className="text-lg md:text-xl font-light leading-relaxed text-zinc-300 text-center mb-4">
                  让洞察触手可及，让每个决策与实时世界对话。
                </p>
                <div className="text-base font-light text-zinc-300 text-center">
                  <p className="mb-1">研究已经变得更便宜，更迅速，</p>
                  <p className="font-medium text-[#1bff1b]">但唯有好问题与好猜想，才真正无价。</p>
                </div>
              </div>

              {/* 最终愿景 */}
              <div className="bg-gradient-to-r from-[#1e1e1e] to-[#2a2a2a] border border-[#1bff1b] rounded-xl p-6 text-center shadow-[0_0_30px_rgba(27,255,27,0.15)]">
                <p className="text-base md:text-lg font-light text-zinc-300 mb-4">
                  从依赖历史数据的<span className="font-medium">被动分析</span>
                  ，转向基于智能体的<span className="font-medium text-[#1bff1b]">主动模拟</span>
                </p>
                <p className="text-sm md:text-base text-[#1bff1b] leading-relaxed">
                  这种从&ldquo;静态分析&rdquo;到&ldquo;动态执行&rdquo;的转变，让企业能够在几小时内完成从问题识别到策略制定的全流程，
                  实现从&ldquo;先研究，再决策&rdquo;到&ldquo;边研究，边决策，边执行&rdquo;的敏捷商业模式。
                </p>
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
    <div className="flex-1 bg-[#0a0a0a] relative flex flex-col overflow-hidden">
      {/* Main slide content */}
      <div className="flex-1 flex items-center justify-center p-4" style={deckStyles}>
        {/* PPT Container with responsive aspect ratio */}
        <div
          className="w-full max-w-7xl aspect-[16/10] bg-[#121212] relative flex flex-col shadow-2xl border border-zinc-600"
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
    </div>
  );
}
