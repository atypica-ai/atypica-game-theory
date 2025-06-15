import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FC } from "react";

export const RealPersonAgentsMethodology: FC = () => {
  const t = useTranslations("StudyPage.ToolConsole");
  const locale = useLocale();

  const content: Record<
    string,
    {
      cardTitle: string;
      cardDescription: string;
      coreValue: string;
      coreDesc: string;
      advantageTitle: string;
      advantages: Array<{ label: string; desc: string }>;
      performanceTitle: string;
      performanceDesc: string;
      comparisonTitle: string;
      comparison: Array<{ method: string; score: string; desc: string }>;
    }
  > = {
    "zh-CN": {
      cardTitle: "真人智能体技术",
      cardDescription: "解决复杂商业问题的新一代消费者建模技术",
      coreValue: "核心价值",
      coreDesc:
        '真人智能体通过深度访谈构建完整的消费者"数字分身"，能够在新情境下表现出一致的人格特征和决策逻辑，为解决商业和社会领域的复杂问题提供全新可能性。',
      advantageTitle: "技术优势",
      advantages: [
        {
          label: "超越传统建模",
          desc: "相较于基于人口统计或行为数据的传统方法，准确率提升25-30%",
        },
        {
          label: "接近人类基线",
          desc: "一致性表现达到接近81%的人类自我一致性极限，代表AI模拟的最高水准",
        },
        {
          label: "跨情境稳定",
          desc: "在新问题和情境下仍能保持75+分的高一致性表现",
        },
      ],
      performanceTitle: "性能表现",
      performanceDesc:
        "通过120份商业研究报告的用户满意度测试，真人智能体在洞察分析、营销策略等场景中表现优异，整体满意度达到4.0/5.0，与人工报告持平。",
      comparisonTitle: "建模方法对比",
      comparison: [
        { method: "个人信息", score: "55分", desc: "基础人口统计信息" },
        { method: "消费数据", score: "73分", desc: "CRM/CDP平台数据" },
        { method: "社交媒体", score: "79分", desc: "针对性平台数据分析" },
        { method: "深度访谈", score: "85分", desc: "1-2小时访谈，5000+字转录" },
      ],
    },
    "en-US": {
      cardTitle: "Real Person Agent Technology",
      cardDescription: "Next-generation consumer modeling for complex business challenges",
      coreValue: "Core Value",
      coreDesc:
        "Real Person Agents create complete consumer 'digital twins' through in-depth interviews, capable of exhibiting consistent personality traits and decision logic in new contexts, providing new possibilities for solving complex problems in business and social domains.",
      advantageTitle: "Technical Advantages",
      advantages: [
        {
          label: "Beyond Traditional Modeling",
          desc: "25-30% accuracy improvement compared to demographic or behavioral data-based methods",
        },
        {
          label: "Approaching Human Baseline",
          desc: "Consistency performance reaches near 81% human self-consistency limit, representing AI simulation peak",
        },
        {
          label: "Cross-Situational Stability",
          desc: "Maintains 75+ point consistency in new questions and contexts",
        },
      ],
      performanceTitle: "Performance Results",
      performanceDesc:
        "Through satisfaction testing of 120 business research reports, Real Person Agents excel in insight analysis and marketing strategy scenarios, achieving overall 4.0/5.0 satisfaction, matching human-written reports.",
      comparisonTitle: "Modeling Method Comparison",
      comparison: [
        { method: "Personal Info", score: "55pts", desc: "Basic demographic information" },
        { method: "Consumer Data", score: "73pts", desc: "CRM/CDP platform data" },
        { method: "Social Media", score: "79pts", desc: "Targeted platform analysis" },
        { method: "In-depth Interview", score: "85pts", desc: "1-2hr interviews, 5000+ words" },
      ],
    },
  };

  const currentContent = content[locale as keyof typeof content] || content["en-US"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{currentContent.cardTitle}</CardTitle>
        <CardDescription className="text-xs">{currentContent.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">{currentContent.coreValue}</h4>
            <p className="text-muted-foreground leading-relaxed">{currentContent.coreDesc}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">{currentContent.advantageTitle}</h4>
            <ul className="space-y-2 text-muted-foreground">
              {currentContent.advantages.map((advantage, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>{advantage.label}：</strong>
                    {advantage.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">{currentContent.comparisonTitle}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {currentContent.comparison.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-muted/30 rounded"
                >
                  <span className="font-medium">{item.method}</span>
                  <span className="text-primary font-semibold">{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">{currentContent.performanceTitle}</h4>
            <p className="text-muted-foreground leading-relaxed">
              {currentContent.performanceDesc}
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link href="/persona-simulation" target="_blank">
                {t("learnMore")}
                <ExternalLinkIcon className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
