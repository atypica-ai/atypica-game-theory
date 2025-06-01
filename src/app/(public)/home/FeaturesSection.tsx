"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BrainIcon, ClockIcon, MessageSquareIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function FeaturesSection() {
  const t = useTranslations("HomePage.FeaturesSection");

  const features = [
    {
      icon: UsersIcon,
      title: t("features.personaConstruction.title"),
      description: t("features.personaConstruction.description"),
      highlight: true,
    },
    {
      icon: MessageSquareIcon,
      title: t("features.agentInterviews.title"),
      description: t("features.agentInterviews.description"),
      highlight: false,
    },
    {
      icon: BrainIcon,
      title: t("features.cognitiveModeling.title"),
      description: t("features.cognitiveModeling.description"),
      highlight: true,
    },
    {
      icon: ClockIcon,
      title: t("features.rapidResearch.title"),
      description: t("features.rapidResearch.description"),
      highlight: false,
    },
  ];

  return (
    <div className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="mb-4">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold heading-serif">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={cn("feature-card h-full reveal-up", `reveal-delay-${index + 1}`)}
              >
                <CardHeader className="space-y-3">
                  <div className="tech-icon w-12 h-12 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg heading-serif">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
