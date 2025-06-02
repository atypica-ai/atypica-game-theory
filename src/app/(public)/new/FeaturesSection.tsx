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
      title: t("features.rapidStudies.title"),
      description: t("features.rapidStudies.description"),
      highlight: false,
    },
  ];

  return (
    <div className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <Badge variant="outline" className="mb-4">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className={cn("h-full reveal-up", `reveal-delay-${index + 1}`)}>
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="tech-icon w-10 h-10 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl font-medium tracking-tight leading-tight">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
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
