"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BrainCircuitIcon,
  BuildingIcon,
  CodeIcon,
  HeadphonesIcon,
  LightbulbIcon,
  LucideIcon,
  MessageSquareIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback } from "react";
import { createHelloUserChatAction } from "../pricing/actions";

export function EnterpriseZH() {
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
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BuildingIcon className="size-4" />
            企业级解决方案
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">完整的 AI 用户研究平台</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            适用于规模化运营的企业。获得最全面的 AI 研究解决方案，不限席位，每月 5000 万 Token，以及专属支持服务。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={sayHelloToSales}>
              联系销售
            </Button>
            <Button size="lg" variant="outline" onClick={() => (window.location.href = "/pricing#organization")}>
              查看价格
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">核心产品</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              全面的 AI 驱动研究工具，大规模理解您的用户
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* AI Research */}
            <ProductCard
              icon={BrainCircuitIcon}
              title="AI Research - 智能用户洞察系统"
              features={[
                {
                  title: "研究流程自动化",
                  description:
                    "自动化完整的战略研究流程，从问题定义到洞察输出，可视化追踪研究进度和工作流管理",
                },
                {
                  title: "研究方法论",
                  description: "企业版配备高级研究模型，提供更深入的分析框架和更严谨的推理逻辑",
                },
                {
                  title: "执行摘要与报告",
                  description: "自动生成结构化、可视化的专业战略研究报告",
                },
              ]}
            />

            {/* AI Interview */}
            <ProductCard
              icon={MessageSquareIcon}
              title="AI Interview - 智能用户访谈系统"
              features={[
                {
                  title: "智能访谈执行",
                  description: "AI 自动生成访谈问题或用户设置访谈问题，与真实用户和 AI 人设进行专业访谈",
                },
                {
                  title: "访谈记录管理",
                  description: "自动记录、整理和归档所有访谈内容",
                },
                {
                  title: "洞察提取与分析",
                  description: "从访谈内容中自动提取关键洞察、痛点和需求",
                },
              ]}
            />

            {/* AI Persona */}
            <ProductCard
              icon={UsersIcon}
              title="AI Persona - 智能用户画像构建"
              features={[
                {
                  title: "多维度画像生成",
                  description: "基于人口统计、心理特征和行为模式等 7 个维度构建多维度用户画像",
                },
                {
                  title: "动态画像更新",
                  description: "基于持续收集的受访者反馈更新和优化用户画像",
                },
                {
                  title: "画像可视化",
                  description: "以直观的方式展示用户画像特征和属性",
                },
                {
                  title: "交互式画像对话",
                  description: "支持与 AI 模拟的用户画像进行实时对话，深入探索其认知、态度和决策逻辑",
                },
              ]}
            />

            {/* AI Panel */}
            <ProductCard
              icon={UsersIcon}
              title="AI Panel - 智能用户小组"
              features={[
                {
                  title: "企业研究小组",
                  description: "根据客户需求，从公共 AI Persona 库中灵活组建用户小组",
                },
                {
                  title: "公共研究小组",
                  description: "Atypica 预设的常见画像用户小组，开箱即用",
                },
              ]}
            />
          </div>

          {/* AI Product R&D - Full width */}
          <Card className="not-dark:border-muted/40">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <LightbulbIcon className="size-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">AI Product R&D - AI 产品创新</CardTitle>
                  <CardDescription>从 0 到 1 开发全新产品，识别市场机会，设计产品概念</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Enterprise Advanced Features */}
      <section className="px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">企业高级功能</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">专为企业需求设计的额外功能</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Report Templates */}
            <FeatureCard
              icon={SparklesIcon}
              title="企业报告模板"
              description="支持企业用户自定义 AI Research 报告模板，包括 Logo、格式等"
            />

            {/* Knowledge Base */}
            <FeatureCard
              icon={BrainCircuitIcon}
              title="企业知识库"
              description="支持企业用户上传企业背景资料、产品信息、市场数据、战略文件等背景知识用于研究"
            />

            {/* API Interface */}
            <FeatureCard
              icon={CodeIcon}
              title="API 接口"
              description="通过我们全面的 API 将 AI Research 功能直接集成到您自己的系统和工作流程中，实现自动化研究流程和无缝数据集成"
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">企业服务</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              专属支持和定制服务，助力企业成功
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Success Services */}
            <ServiceCard
              icon={HeadphonesIcon}
              title="客户成功服务"
              description="包含技术支持、月度培训、定期系统维护"
              items={[
                {
                  title: "技术支持",
                  details: [
                    "响应时间：每个工作日 8 小时",
                    "支持渠道：邮件、微信、电话",
                    "支持内容：功能使用咨询和故障排除、技术问题调查和解决",
                  ],
                },
                {
                  title: "培训服务",
                  details: [
                    "培训频率：每月 1 小时专属培训",
                    "培训形式：在线视频会议/线下培训（上海）",
                    "培训内容：新功能介绍和使用指导、高级功能和技巧分享、行业最佳实践案例",
                  ],
                },
                {
                  title: "系统维护",
                  details: [
                    "更新频率：定期每月更新",
                    "维护内容：功能优化和错误修复、性能改进和体验增强、新功能发布和升级、安全补丁和稳定性维护",
                  ],
                },
              ]}
            />

            {/* Enterprise Advanced Services */}
            <ServiceCard
              icon={SparklesIcon}
              title="企业高级服务"
              description="报告模板定制、AI Persona 定制、AI Panel 定制"
              items={[
                {
                  title: "企业 AI Research 报告模板定制",
                  details: ["根据企业需求定制专属报告模板服务"],
                },
                {
                  title: "定制化 AI Persona",
                  details: ["根据企业需求定制企业用户画像服务"],
                },
                {
                  title: "定制化 AI Panel",
                  details: ["根据企业具体需求定制专属用户画像 Panels，每个用户小组不少于 50 人"],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">准备好转型您的研究了吗？</h2>
          <p className="text-lg text-muted-foreground mb-8">
            联系我们的销售团队，了解 atypica.AI 企业版如何帮助您的组织
          </p>
          <Button size="lg" onClick={sayHelloToSales}>
            联系销售
          </Button>
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({
  icon: Icon,
  title,
  features,
}: {
  icon: LucideIcon;
  title: string;
  features: { title: string; description: string }[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="size-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl mb-4">{title}</CardTitle>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="text-sm">
                  <div className="font-semibold mb-1">{feature.title}</div>
                  <div className="text-muted-foreground">{feature.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-3">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-xl mb-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

// Service Card Component
function ServiceCard({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: { title: string; details: string[] }[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border-l-2 border-primary/20 pl-4">
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <ul className="space-y-1">
                {item.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="text-sm text-muted-foreground">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
