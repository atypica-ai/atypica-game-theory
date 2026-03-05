"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const JoinUsZH: React.FC = () => {
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
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              <span
                className="sm:hidden absolute left-1/2 -translate-x-1/2 rounded-full -top-2 w-16 h-0.5"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              <span className="font-EuclidCircularA font-normal text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.3]">
                加入 <span className="font-bold">atypica.AI</span>
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-4xl leading-relaxed mb-4">
              用「语言模型」为「主观世界」建模
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 max-w-3xl italic">
              &ldquo;一起构建理解人类决策的AI智能&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* 成果展示 */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-8">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">我们已经取得的成果</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">300K+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                AI人设创建数量
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">+1M</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                模拟访谈完成数量
              </div>
            </div>
            <div className="border border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-all">
              <div className="text-3xl md:text-4xl font-bold mb-2">&lt;30m</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                平均研究时长
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-8 space-y-20 md:space-y-32 py-12">
        {/* 增长职位 */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              增长
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              通过创作者合作和公开构建驱动增长。帮助研究者、咨询师和分析师创造展示真实 AI
              研究成果的内容 - 将他们的成功案例转化为我们最好的营销。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你将负责
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>
                    • 与行业创作者（研究者、咨询师、分析师）合作，产出展示 atypica.AI
                    真实使用场景和成果的高质量内容
                  </li>
                  <li>
                    • 公开构建：在 Twitter/LinkedIn
                    上分享产品更新、用户故事和洞察，让社交媒体成为主要增长渠道
                  </li>
                  <li>• 管理创作者合作项目：创作者入驻、内容质量把控、协作流程设计</li>
                  <li>• 追踪真正驱动增长的指标：不是虚荣指标，而是内容驱动的注册和激活</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你需要具备
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• 英文流畅，具备强大的叙事能力和沟通技巧</li>
                  <li>• 有 B2B 创作者合作经验，或公开构建社区的经验</li>
                  <li>• 产品直觉：理解功能如何成为故事，故事如何驱动增长</li>
                  <li>• 适应高速发布文化：新功能 = 新的内容机会</li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "var(--ghost-green)" }}>
                  &ldquo;社交媒体就是转化漏斗&rdquo; - 增长发生在对话的地方，而不是广告后台。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 产品职位 */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              产品
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              设计用户喜爱并愿意分享的 AI 研究工具。每个功能都应该是&ldquo;最小可爱产品&rdquo; -
              让用户愿意主动告诉别人。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你将设计
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• 用户能立即理解并喜欢使用的研究工作流</li>
                  <li>• 感觉自然而非机械的 AI 交互模式</li>
                  <li>• 创造&ldquo;哇时刻&rdquo;的功能 - 那种用户会截图分享的</li>
                  <li>• 驱动自然口碑传播的用户体验</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你需要具备
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• 对研究者、咨询师、分析师有深刻共情 - 你理解他们的日常工作</li>
                  <li>• 设计执行力：快速原型 → 用户测试 → 发布，循环往复</li>
                  <li>• 适应快节奏：在 AI 领域，功能要快速发布，否则就过时了</li>
                  <li>• 英文流畅，具备全球化产品思维</li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "var(--ghost-green)" }}>
                  &ldquo;最小可爱产品&rdquo; - 如果用户不爱到愿意分享，就继续迭代。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 研发职位 */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              研发
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-foreground/90 leading-relaxed mb-8">
              构建将商业问题转化为洞察的 AI
              研究引擎。快速发布功能，让产品始终感觉&ldquo;活着&rdquo;。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你将构建
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• AI 研究工作流：从问题 → 人设创建 → 访谈 → 洞察</li>
                  <li>• 多智能体模拟系统，实现逼真的研究对话</li>
                  <li>• 连接 LLM、工具和用户工作流的集成层</li>
                  <li>• 让非技术用户感到强大的功能</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-6 hover:border-foreground/20 transition-all">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: "var(--ghost-green)" }}></span>
                  你需要具备
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li>• 全栈构建能力：TypeScript、React、现代 Web 架构</li>
                  <li>• LLM 集成经验：提示词、流式输出、多步推理</li>
                  <li>• 倾向快速发布：原型 → 测试 → 迭代，快速循环</li>
                  <li>• 产品感知：理解什么让 AI 功能感觉神奇，什么让它笨拙</li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-6 border-l-2 pl-3" style={{ borderColor: "var(--ghost-green)" }}>
                  &ldquo;快速发布，更快学习&rdquo; - 在 AI 产品中，速度本身就是功能。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 团队成员 */}
        <section>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">
              <span
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                style={{ backgroundColor: "var(--ghost-green)" }}
              ></span>
              认识我们的构建者
            </h2>
            <div className="h-px bg-border mb-8"></div>

            <p className="text-base md:text-lg text-muted-foreground mb-8 text-center">
              想了解更多关于atypica.AI的信息？直接与我们的构建者聊天，一起探索我们正在创造的未来。
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

        {/* 联系方式 */}
        <section>
          <div className="max-w-3xl mx-auto border border-border rounded-lg p-8 md:p-12 text-center hover:border-foreground/20 transition-all">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">准备好塑造未来了吗？</h2>
            <p className="text-base md:text-lg text-muted-foreground mb-8">
              加入我们为主观世界建模的使命，构建理解人类决策的AI系统。
            </p>
            <div className="space-y-4">
              <a
                href="mailto:xd@atypica.ai"
                className="inline-block px-8 py-3 rounded-full font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--ghost-green)", color: "#000" }}
              >
                xd@atypica.ai
              </a>
              <p className="text-sm text-muted-foreground">
                邮件请包含：简历、作品集或GitHub链接、感兴趣的职位
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
