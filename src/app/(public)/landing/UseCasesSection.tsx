"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightIcon,
  BuildingIcon,
  LightbulbIcon,
  ShoppingCartIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const useCases = [
  {
    icon: TrendingUpIcon,
    key: "marketResearch",
    category: "Market Intelligence",
    color: "from-blue-500/10 to-blue-600/10",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200/50",
  },
  {
    icon: UsersIcon,
    key: "customerInsights",
    category: "Customer Analysis",
    color: "from-green-500/10 to-green-600/10",
    iconColor: "text-green-600",
    borderColor: "border-green-200/50",
  },
  {
    icon: TargetIcon,
    key: "competitorAnalysis",
    category: "Competitive Intelligence",
    color: "from-purple-500/10 to-purple-600/10",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200/50",
  },
  {
    icon: LightbulbIcon,
    key: "productDevelopment",
    category: "Innovation",
    color: "from-orange-500/10 to-orange-600/10",
    iconColor: "text-orange-600",
    borderColor: "border-orange-200/50",
  },
  {
    icon: ShoppingCartIcon,
    key: "consumerBehavior",
    category: "Behavioral Analysis",
    color: "from-pink-500/10 to-pink-600/10",
    iconColor: "text-pink-600",
    borderColor: "border-pink-200/50",
  },
  {
    icon: BuildingIcon,
    key: "industryTrends",
    category: "Industry Analysis",
    color: "from-indigo-500/10 to-indigo-600/10",
    iconColor: "text-indigo-600",
    borderColor: "border-indigo-200/50",
  },
];

const getUseCaseTitle = (key: string) => {
  const titles: Record<string, string> = {
    marketResearch: "Market Research",
    customerInsights: "Customer Intelligence",
    competitorAnalysis: "Competitive Intelligence",
    productDevelopment: "Product Innovation",
    consumerBehavior: "Consumer Behavior",
    industryTrends: "Industry Analysis",
  };
  return titles[key] || key;
};

const getUseCaseDescription = (key: string) => {
  const descriptions: Record<string, string> = {
    marketResearch:
      "Comprehensive market analysis including size, trends, competition, and opportunities",
    customerInsights:
      "Deep understanding of customer needs, preferences, and decision-making processes",
    competitorAnalysis:
      "Strategic analysis of competitors, their positioning, and market opportunities",
    productDevelopment: "Research-driven product development and innovation strategy insights",
    consumerBehavior:
      "Behavioral analysis to understand how and why customers make purchasing decisions",
    industryTrends: "Comprehensive industry trend analysis and future outlook predictions",
  };
  return descriptions[key] || key;
};

const getUseCaseBenefit = (key: string, index: number) => {
  const benefits: Record<string, string[]> = {
    marketResearch: [
      "Market size and growth projections",
      "Competitive landscape analysis",
      "Consumer behavior insights",
    ],
    customerInsights: [
      "Customer segmentation analysis",
      "Journey mapping and pain points",
      "Satisfaction and loyalty drivers",
    ],
    competitorAnalysis: [
      "Competitor strengths and weaknesses",
      "Market positioning strategies",
      "Opportunity gap identification",
    ],
    productDevelopment: [
      "Feature prioritization guidance",
      "Market validation insights",
      "Innovation opportunity mapping",
    ],
    consumerBehavior: [
      "Purchase decision factors",
      "Behavioral pattern analysis",
      "Influence channel effectiveness",
    ],
    industryTrends: [
      "Emerging trend identification",
      "Industry disruption signals",
      "Future scenario planning",
    ],
  };
  return benefits[key]?.[index - 1] || `Benefit ${index}`;
};

export function UseCasesSection() {
  const t = useTranslations();

  return (
    <div className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Use Cases
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Research solutions for every business need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover how leading companies use atypica.AI across different scenarios
          </p>
        </div>

        {/* Use cases grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Card
                key={useCase.key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${useCase.borderColor} group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-50`} />

                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div
                      className={`rounded-xl p-3 bg-background/80 backdrop-blur-sm ${useCase.iconColor}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {useCase.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">{getUseCaseTitle(useCase.key)}</CardTitle>
                </CardHeader>

                <CardContent className="relative">
                  <CardDescription className="text-sm leading-relaxed mb-4">
                    {getUseCaseDescription(useCase.key)}
                  </CardDescription>

                  {/* Key benefits */}
                  <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                    {[1, 2, 3].map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {getUseCaseBenefit(useCase.key, i)}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full group-hover:bg-background/80 group-hover:text-primary transition-colors"
                    asChild
                  >
                    <Link href={`/study?template=${useCase.key}`}>
                      Try Example
                      <ArrowRightIcon className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Have a specific research need?</h3>
            <p className="text-muted-foreground mb-6">
              Our AI adapts to any business research question you have
            </p>
            <Button size="lg" asChild>
              <Link href="/study">
                Start Custom Research
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
