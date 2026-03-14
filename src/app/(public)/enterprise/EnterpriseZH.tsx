"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  ChevronRightIcon,
  CodeIcon,
  HeadphonesIcon,
  LightbulbIcon,
  LucideIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { createHelloUserChatAction } from "../pricing/actions";

export function EnterpriseZH() {
  const t = useTranslations("EnterprisePage");
  const sayHelloToSales = useCallback(async () => {
    const result = await createHelloUserChatAction({
      role: "user",
      content: "我是企业用户，想了解一下企业版",
    });
    if (!result.success) {
      throw result;
    }
    const chat = result.data;
    window.location.href = `/agents/hello/${chat.id}`;
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <ShieldCheckIcon className="size-4" />
            企业就绪 • SOC2 合规
          </div>
          <h1
            className={cn(
              "font-EuclidCircularA max-w-5xl mx-auto mb-6",
              "font-medium tracking-tight text-4xl md:text-6xl zh:tracking-wide",
            )}
          >
            规模化研究 <br />
            <span className="italic font-InstrumentSerif tracking-normal">AI 驱动的洞察</span>
          </h1>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 mb-12">
            专为规模化运营的企业打造。不限席位，每月 5000 万 Token，
            <br />
            专属支持服务， 改变您的组织理解用户的方式。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="rounded-full h-12 has-[>svg]:px-6"
              onClick={sayHelloToSales}
            >
              联系销售
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full h-12"
              onClick={() => (window.location.href = "/pricing#organization")}
            >
              查看价格
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">5000万</div>
              <div className="text-sm text-muted-foreground">每月 Token</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">∞</div>
              <div className="text-sm text-muted-foreground">不限席位</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">8小时</div>
              <div className="text-sm text-muted-foreground">支持响应</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">API</div>
              <div className="text-sm text-muted-foreground">完整集成</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Products */}
      <section className="py-20 md:py-28 bg-muted/30 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">
              核心平台
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4 zh:tracking-wide">
              完整研究套件
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              五大集成产品，大规模理解用户
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            {/* AI Research - Featured */}
            <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0">
                  <div className="p-4 rounded-xl bg-white/20">
                    <BrainCircuitIcon className="size-8" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">AI Research - 智能用户洞察系统</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="font-semibold mb-2">研究流程自动化</div>
                      <div className="text-sm opacity-90">
                        从问题定义到洞察输出的自动化战略研究，可视化追踪进度
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">高级研究方法论</div>
                      <div className="text-sm opacity-90">
                        企业级模型提供更深入的分析框架和严谨的推理逻辑
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">执行报告</div>
                      <div className="text-sm opacity-90">
                        自动生成结构化、可视化的专业战略研究报告
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Products Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <ProductCard
                icon={MessageSquareIcon}
                title="AI Interview"
                subtitle="智能用户访谈系统"
                features={[
                  "AI 生成的专业访谈，支持真实用户和 AI 人设",
                  "自动记录和整理",
                  "洞察提取与分析",
                ]}
              />

              <ProductCard
                icon={UsersIcon}
                title="AI Persona"
                subtitle="智能用户画像构建"
                features={[
                  "基于 7 个维度的多维度画像",
                  "基于反馈的动态更新",
                  "与 AI 人设的交互式对话",
                ]}
              />

              <ProductCard
                icon={UsersIcon}
                title="AI Panel"
                subtitle="智能用户小组"
                features={["灵活的企业研究小组", "预配置的通用用户小组", "自定义小组组建"]}
              />

              <ProductCard
                icon={LightbulbIcon}
                title="AI Product R&D"
                subtitle="AI 产品创新"
                features={["从 0 到 1 的产品开发", "市场机会识别", "产品概念设计"]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 md:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">
              企业能力
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4 zh:tracking-wide">
              为您的组织而构建
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              专为企业需求设计的额外功能
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            <EnterpriseFeatureCard
              icon={SparklesIcon}
              title="报告模板"
              description="使用您的品牌、Logo 和格式自定义 AI Research 报告模板"
              color="purple"
            />

            <EnterpriseFeatureCard
              icon={BrainCircuitIcon}
              title="知识库"
              description="上传企业资料、产品信息、市场数据，实现上下文感知研究"
              color="blue"
            />

            <EnterpriseFeatureCard
              icon={CodeIcon}
              title="API 集成"
              description="将 AI Research 集成到您的系统和工作流程中，实现自动化流程"
              color="yellow"
            />

            <EnterpriseFeatureCard
              icon={ShieldCheckIcon}
              title="安全与合规"
              description="通过 SOC 2 认证，提供企业级安全和数据保护"
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-20 md:py-32 bg-zinc-900 text-white overflow-hidden relative px-4">
        <div className="absolute inset-0 bg-[url('/_public/grid.svg')] opacity-10" />
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20">
                <ShieldCheckIcon className="size-4" />
                企业就绪
              </div>
              <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight zh:tracking-wide">
                企业级安全标准 <br />
                <span className="text-zinc-400">SOC2 认证</span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-xl">
                我们重视您的数据安全和隐私。我们的平台建立在企业级基础设施之上，符合严格的合规标准。
              </p>

              <div className="mt-12 p-6 md:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="flex items-start md:items-center gap-6">
                  <div className="shrink-0 p-4 rounded-xl bg-green-500/10 text-green-400 shadow-[0_0_20px_-5px_rgba(74,222,128,0.3)]">
                    <ShieldCheckIcon className="size-8 md:size-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">SOC2 认证</h3>
                    <p className="text-zinc-400 text-sm md:text-base max-w-md">
                      我们的平台已通过严格的安全与合规审计认证。
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 pl-4 lg:pl-0 lg:pr-4 border-l-2 border-zinc-800 lg:border-l-0 lg:border-l-transparent">
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                      状态
                    </span>
                    <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-sm font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      持续合规中
                    </div>
                  </div>
                  <div className="hidden lg:block h-10 w-px bg-zinc-800"></div>
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                      审计方
                    </span>
                    <span className="text-white font-medium">AICPA 认证机构</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Services */}
      <section className="py-20 md:py-28 bg-muted/30 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">
              专属支持
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4 zh:tracking-wide">
              企业服务
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              专业支持和定制服务，助力您的成功
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            {/* Customer Success */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border-2 border-amber-500/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                    <HeadphonesIcon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">客户成功服务</h3>
                    <p className="text-sm text-muted-foreground">技术支持、培训和维护</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 w-fit">
                  {t("paidValueAddedService")}
                </div>
              </div>

              <div className="space-y-4">
                <ServiceDetail
                  title="技术支持"
                  items={[
                    "每个工作日 8 小时响应时间",
                    "邮件、微信和电话支持",
                    "功能咨询和故障排除",
                  ]}
                />
                <ServiceDetail
                  title="培训服务"
                  items={["每月 1 小时专属培训", "在线/线下培训可选", "功能指导和最佳实践"]}
                />
                <ServiceDetail
                  title="系统维护"
                  items={["定期每月更新", "性能改进", "安全补丁和稳定性"]}
                />
              </div>
            </div>

            {/* Advanced Services */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border-2 border-amber-500/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                    <SparklesIcon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">企业高级服务</h3>
                    <p className="text-sm text-muted-foreground">为您的组织定制解决方案</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 w-fit">
                  {t("paidValueAddedService")}
                </div>
              </div>

              <div className="space-y-4">
                <ServiceDetail title="报告模板定制" items={["根据您的需求定制专属报告模板"]} />
                <ServiceDetail title="定制 AI 人设" items={["根据您的需求定制企业用户画像服务"]} />
                <ServiceDetail title="定制 AI 小组" items={["每个小组 50+ 人设的专属用户小组"]} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl mx-auto text-center bg-linear-to-br from-primary/10 to-primary/5 rounded-3xl p-12 md:p-16">
            <h2 className="font-EuclidCircularA font-medium text-3xl md:text-5xl mb-6 zh:tracking-wide">
              准备好转型您的研究了吗？
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              联系我们的销售团队，了解 atypica.AI 企业版如何帮助您的组织大规模理解用户
            </p>
            <Button
              size="lg"
              className="rounded-full h-12 has-[>svg]:px-6"
              onClick={sayHelloToSales}
            >
              联系销售
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({
  icon: Icon,
  title,
  subtitle,
  features,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: string[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="size-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{title}</CardTitle>
            <CardDescription className="mb-4">{subtitle}</CardDescription>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Enterprise Feature Card Component
function EnterpriseFeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: "purple" | "blue" | "yellow" | "green";
}) {
  const colorClasses = {
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 text-center">
      <div className={cn("p-3 rounded-xl w-fit mx-auto mb-4", colorClasses[color])}>
        <Icon className="size-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Service Detail Component
function ServiceDetail({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-l-2 border-primary/20 pl-4">
      <h4 className="font-semibold mb-2 text-sm">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
