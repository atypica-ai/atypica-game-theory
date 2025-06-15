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
      title: string;
      description: string;
      methodTitle: string;
      methods: Array<{ label: string; desc: string }>;
      accuracyTitle: string;
      accuracyDesc: string;
    }
  > = {
    "zh-CN": {
      cardTitle: "关于真人智能体",
      cardDescription: "基于斯坦福小镇论文方法构建的真人智能体",
      title: "什么是真人智能体？",
      description:
        "真人智能体是基于斯坦福小镇论文方法构建的高仿真度消费者模型。通过AI对真实消费者进行1-2小时的深度访谈，产生平均5000字的转录文本，为每个消费者建立完整的数字分身。",
      methodTitle: "构建方法",
      methods: [
        {
          label: "深度访谈",
          desc: "基于美国声音项目方法，涵盖生活历程、价值观探索、社会观点表达等多个维度",
        },
        { label: "完整建模", desc: "将访谈转录本直接作为大语言模型上下文，保持信息完整性和连贯性" },
        { label: "质量验证", desc: "通过多重验证机制确保智能体回答的一致性和准确性" },
      ],
      accuracyTitle: "准确性表现",
      accuracyDesc:
        "研究显示，真实人类对同一问题在相隔两周后的回答一致性约为81%。我们的真人智能体在相同测试中表现接近这一人类基线，代表了目前AI模拟人类决策的最高水准。",
    },
    "en-US": {
      cardTitle: "About Real Person Agents",
      cardDescription: "Real person agents built using Stanford Town paper methodology",
      title: "What are Real Person Agents?",
      description:
        "Real Person Agents are high-fidelity consumer models built using Stanford Town paper methodology. Through AI-conducted 1-2 hour in-depth interviews with real consumers, we generate an average of 5,000 words of transcript, creating complete digital twins for each consumer.",
      methodTitle: "Construction Methods",
      methods: [
        {
          label: "In-depth Interviews",
          desc: "Based on American Voices Project methodology, covering life journeys, value exploration, social viewpoints, and more",
        },
        {
          label: "Complete Modeling",
          desc: "Using interview transcripts directly as LLM context, maintaining information integrity and coherence",
        },
        {
          label: "Quality Validation",
          desc: "Multiple validation mechanisms ensure agent response consistency and accuracy",
        },
      ],
      accuracyTitle: "Accuracy Performance",
      accuracyDesc:
        "Research shows that real humans have about 81% consistency when answering the same question two weeks apart. Our Real Person Agents perform close to this human baseline in the same tests, representing the highest standard of AI human decision simulation.",
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
            <h4 className="font-medium mb-2">{currentContent.title}</h4>
            <p className="text-muted-foreground leading-relaxed">{currentContent.description}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">{currentContent.methodTitle}</h4>
            <ul className="space-y-2 text-muted-foreground">
              {currentContent.methods.map((method, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>{method.label}：</strong>
                    {method.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">{currentContent.accuracyTitle}</h4>
            <p className="text-muted-foreground leading-relaxed">{currentContent.accuracyDesc}</p>
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
