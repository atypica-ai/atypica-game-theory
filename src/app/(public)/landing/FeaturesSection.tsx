"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChartIcon,
  BrainIcon,
  ClockIcon,
  FileTextIcon,
  GlobeIcon,
  SearchIcon,
  ShieldIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

const features = [
  {
    icon: BrainIcon,
    key: "aiPowered",
    highlight: true,
  },
  {
    icon: ClockIcon,
    key: "fastResults",
    highlight: false,
  },
  {
    icon: GlobeIcon,
    key: "multiLanguage",
    highlight: false,
  },
  {
    icon: FileTextIcon,
    key: "comprehensiveReports",
    highlight: true,
  },
  {
    icon: SearchIcon,
    key: "deepInsights",
    highlight: false,
  },
  {
    icon: BarChartIcon,
    key: "dataVisualization",
    highlight: false,
  },
  {
    icon: UsersIcon,
    key: "collaboration",
    highlight: false,
  },
  {
    icon: ShieldIcon,
    key: "security",
    highlight: true,
  },
  {
    icon: TrendingUpIcon,
    key: "scalable",
    highlight: false,
  },
];

const getFeatureTitle = (key: string) => {
  const titles: Record<string, string> = {
    aiPowered: "Advanced AI Analysis",
    fastResults: "Lightning Fast Results",
    multiLanguage: "Global Language Support",
    comprehensiveReports: "Comprehensive Reports",
    deepInsights: "Deep Market Insights",
    dataVisualization: "Rich Data Visualization",
    collaboration: "Team Collaboration",
    security: "Enterprise Security",
    scalable: "Scalable Solutions",
  };
  return titles[key] || key;
};

const getFeatureDescription = (key: string) => {
  const descriptions: Record<string, string> = {
    aiPowered:
      "Multi-model AI system that processes complex business scenarios with human-level reasoning",
    fastResults: "Get comprehensive research reports in 10-20 minutes instead of weeks",
    multiLanguage: "Analyze markets and consumer behavior across multiple languages and cultures",
    comprehensiveReports:
      "Detailed analysis with actionable insights, data visualizations, and strategic recommendations",
    deepInsights: "Uncover hidden patterns and trends that traditional research methods might miss",
    dataVisualization:
      "Interactive charts, graphs, and visual summaries that make complex data accessible",
    collaboration: "Share reports, collaborate on findings, and build collective intelligence",
    security: "Bank-grade encryption and privacy controls to protect your sensitive business data",
    scalable: "From startup insights to enterprise-wide market intelligence programs",
  };
  return descriptions[key] || key;
};

export function FeaturesSection() {
  const t = useTranslations();

  return (
    <div className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Core Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need for business research
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful AI capabilities designed for modern business intelligence
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  feature.highlight
                    ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                    : "hover:border-primary/20"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        feature.highlight
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{getFeatureTitle(feature.key)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {getFeatureDescription(feature.key)}
                  </CardDescription>
                </CardContent>
                {feature.highlight && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="text-xs">
                      Popular
                    </Badge>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
