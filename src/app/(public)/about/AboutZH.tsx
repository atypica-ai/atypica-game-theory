"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export const AboutZH: React.FC = () => {
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              <span
                className="sm:hidden absolute left-1/2 -translate-x-1/2 rounded-full -top-2 w-16 h-0.5"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              <span className="font-EuclidCircularA font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.3]">
                用<span className="font-bold">「语言模型」</span>为<span className="font-bold">「主观世界」</span>建模
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-4">
              用 AI 为商业研究提供智能支持
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 max-w-3xl italic">
              &ldquo;人们不是在处理概率,而是在处理故事。&rdquo; — 丹尼尔·卡尼曼
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              多智能体协作系统
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              atypica.AI 通过多个专业化的 AI
              智能体协作完成复杂的商业研究任务。每个智能体都有明确的职责和专业领域,通过工具调用和消息传递进行协作。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgentCard
                title="Plan Mode Agent (计划模式智能体)"
                description="意图澄清层,通过灵活对话和自动决策,将用户的模糊需求转化为可执行的研究计划。"
                features={["自动意图分类", "框架选择", "成本估算"]}
              />
              <AgentCard
                title="Study Agent (研究助手)"
                description="全流程协调者,引导用户明确研究需求,协调其他智能体,生成最终报告。"
                features={["研究规划", "智能体协调", "报告生成"]}
              />
              <AgentCard
                title="Scout Agent (用户发现智能体)"
                description="通过社交媒体观察理解目标用户群体,经历三阶段流程:观察 → 推理 → 验证,构建详细人设。"
                features={["社交媒体分析", "人设构建", "行为模式"]}
              />
              <AgentCard
                title="Fast Insight Agent (快速洞察智能体)"
                description="快速研究和播客生成,通过 5 阶段自动化工作流:理解 → 规划 → 研究 → 生成 → 交付。"
                features={["主题研究", "播客规划", "音频生成"]}
              />
              <AgentCard
                title="Interviewer Agent (访谈员智能体)"
                description="专业访谈执行,设计问题、引导对话、分析结果,获取关键洞察。"
                features={["访谈设计", "对话引导", "洞察分析"]}
              />
              <AgentCard
                title="Persona Agent (AI 人设智能体)"
                description="模拟真实用户提供真实反馈,在交互中保持行为一致性和上下文记忆。"
                features={["用户模拟", "行为一致性", "上下文记忆"]}
              />
              <AgentCard
                title="Sage Agent (专家智能体)"
                description="可进化的领域专家智能体,通过结构化记忆文档、知识空白追踪和补充访谈机制实现持续学习和知识演进。"
                features={["记忆即专家", "持续进化", "知识空白识别"]}
              />
              <AgentCard
                title="Moderator AI (主持人 AI)"
                description="讨论主持者,引导 3-8 个 AI 人设进行群体对话,观察观点碰撞和模拟群体决策场景。"
                features={["焦点小组", "圆桌讨论", "辩论协调"]}
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              核心技术
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="space-y-6">
              <TechCard
                title="AI 人设 (三层级)"
                description="通过认知建模模拟的核心研究对象"
                items={[
                  "Tier 1: 社交媒体人设 (79% 一致性)",
                  "Tier 2: 深度访谈人设 (85% 一致性)",
                  "Tier 3: 真人 AI 人设 (私有)",
                ]}
              />

              <TechCard
                title="持久化记忆系统 (双层架构)"
                description="用户和团队级的持久化记忆,让 AI 理解越来越深入"
                items={[
                  "核心记忆: Markdown 格式,长期稳定的用户信息",
                  "工作记忆: JSON 格式,待整合的新信息",
                  "自动重组: 超过阈值时触发,智能压缩和去重",
                  "版本管理: 完整的知识来源追踪和版本历史",
                ]}
              />

              <TechCard
                title="研究专家 (推理模型)"
                description="自研的研究规划和分析推理模型"
                items={["Plan Mode 集成", "多步推理", "成本估算与透明度"]}
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              研究方法
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-xl mb-3 flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <span>访谈 (一对一)</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  一对一深度访谈形式,用于获取个人洞察、情感理解和行为动机分析。适合 5-10 人的访谈研究。
                </p>
                <ul className="space-y-2">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>个人洞察收集</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>深度心理分析</span>
                  </li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-xl mb-3 flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <span>讨论 (群体)</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  多人群体讨论形式,由主持人 AI 引导 3-8 个 AI 人设进行互动,用于观察观点碰撞、模拟群体决策场景。
                </p>
                <ul className="space-y-2">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>焦点小组: 结构化主题探索</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>圆桌讨论: 开放式协作讨论</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>辩论: 论点对抗式交流</span>
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              GEA: 生成式企业架构
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              atypica.AI 基于 GEA (Generative Enterprise Architecture) 构建,专为起点模糊、过程不确定、核心是判断的探索型知识工作而设计。
            </p>

            <div className="space-y-6">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  双 Agent 架构
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  分离推理和执行,职责更清晰,协作更灵活
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>推理 Agent</strong>: 规划执行路径、准备上下文、判断何时调整方向</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>执行 Agent</strong>: 通用执行器,完全依赖推理 Agent 准备的上下文</span>
                  </li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
                  消息即真相来源
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  所有研究内容通过消息流转,数据库只存派生状态
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>统一格式</strong>: 所有工具返回 plainText,统一处理</span>
                  </li>
                  <li className="text-sm text-foreground/80 flex items-start gap-2">
                    <ArrowRight className="size-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span><strong>按需生成</strong>: studyLog 从消息按需生成</span>
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              研究类型
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResearchTypeCard
                title="产品研发"
                description="市场趋势、用户需求和创意生成"
                icon="🔬"
              />
              <ResearchTypeCard
                title="快速洞察"
                description="快速播客导向研究,5 阶段自动化"
                icon="⚡"
              />
              <ResearchTypeCard title="测试" description="产品测试、概念验证和用户反馈" icon="🧪" />
              <ResearchTypeCard
                title="洞察"
                description="消费者行为分析和市场细分"
                icon="💡"
              />
              <ResearchTypeCard
                title="创意"
                description="内容创作、命名和营销文案生成"
                icon="✨"
              />
              <ResearchTypeCard title="规划" description="战略规划和营销活动开发" icon="📋" />
            </div>
          </div>
        </section>

        {/* Research Process Section */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              研究流程
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              只需提出一个具体商业研究问题,系统会通过 10-20
              分钟的&ldquo;长推理&rdquo;给出一份详尽的调研报告。
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { step: 1, title: "明确问题" },
                { step: 2, title: "设计任务" },
                { step: 3, title: "浏览社媒" },
                { step: 4, title: "建立人设" },
                { step: 5, title: "访谈模拟" },
                { step: 6, title: "总结结果" },
                { step: 7, title: "生成报告" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border border-border rounded-lg p-4 text-center hover:border-foreground/20 transition-all"
                >
                  <div className="text-lg font-semibold mb-2" style={{ color: "#1bff1b" }}>
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
            <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">平台数据</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard number="300K+" label="AI 人设创建数量" />
              <StatCard number="+1M" label="模拟访谈完成数量" />
              <StatCard number="<30m" label="平均研究时长" />
            </div>
          </div>
        </section>

        {/* Technical Evolution */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              技术演进
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="space-y-4">
              <TimelineItem
                year="2023"
                title="多 AI 人设互动"
                description="斯坦福小镇首次展示多 AI 人设互动概念"
                color="gray"
              />
              <TimelineItem
                year="2023.12"
                title="模型工具调用"
                description="OpenAI Function Calling 和 Claude MCP 协议实现外部工具集成"
                color="blue"
              />
              <TimelineItem
                year="2024.11"
                title="语言模型为主观世界建模"
                description="斯坦福突破：1000 个美国人模拟,行为一致性达 85%+"
                color="green"
              />
              <TimelineItem
                year="2025.02"
                title="发散优先的长推理"
                description="与客观世界推理强调&ldquo;收敛&rdquo;不同,主观世界推理需要强调&ldquo;发散&rdquo;"
                color="yellow"
              />
              <TimelineItem
                year="2025 年中"
                title="深度推理能力"
                description="Claude Opus 4 和 o1 的深度推理能力突破,支撑 Plan Mode 的智能决策和意图理解"
                color="purple"
              />
              <TimelineItem
                year="2025 年底"
                title="通用 Agent + 技能库"
                description="Anthropic 的愿景：不是构建多个专用 Agent,而是通用 Agent + 可组合技能——启发了 GEA 架构设计"
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
                style={{ backgroundColor: "#1bff1b" }}
              ></span>
              HippyGhosts 社区
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <div className="border border-border rounded-lg p-8 hover:border-foreground/20 transition-all">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-6xl">👻</div>
                <div className="flex-1">
                  <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-4">
                    atypica.AI的视觉形象来自于代表极客精神的快乐嬉皮鬼社区{" "}
                    <a
                      href="https://hippyghosts.io"
                      className="font-semibold hover:underline"
                      style={{ color: "#1bff1b" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      HippyGhosts.io
                    </a>
                    。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    在atypica.AI的世界中,每一个「AI 人设」的物理化身都是一枚「Hippy
                    Ghost」,象征着技术与创意的融合。
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
            查看我们的项目介绍 <ArrowRight className="ml-1 size-4" />
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
        <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
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
        <span className="size-2 rounded-full" style={{ backgroundColor: "#1bff1b" }}></span>
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
