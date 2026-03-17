"use client";

import { getS3CDNUrl } from "@/app/(public)/home-v3/actions";
import { HeroVideo } from "@/app/(public)/home-v3/HeroVideo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Lightbulb,
  MapPin,
  MessageCircle,
  Network,
  ShoppingCart,
  Smartphone,
  Target,
  Upload,
  Users,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function PanelHomePage() {
  const t = useTranslations("PersonaPanel.HomePage");
  const router = useRouter();
  const [videoSrc, setVideoSrc] = useState<string | undefined>();

  useEffect(() => {
    getS3CDNUrl("atypica/public/atypica-promo-ai-persona-20250917.mp4").then((res) => {
      setVideoSrc(res);
    });
  }, []);

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-mono text-sm font-medium tracking-wider text-muted-foreground uppercase">
              {t("tagline")}
            </h1>
            <h2 className="font-sans text-4xl md:text-7xl font-normal tracking-tight text-foreground leading-tight">
              {t("headline")}
            </h2>
          </div>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/panels")}
            >
              <UsersIcon className="h-4 w-4" />
              {t("createPanel")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/panels")}
            >
              <UsersIcon className="h-4 w-4" />
              {t("myPanels")}
            </Button>
          </div>
        </div>
      </section>

      {/* Video Section - hidden until video is ready */}
      <section className="border-t border-border hidden">
        <div className="relative max-w-5xl mx-auto mt-16 px-4 pb-20 md:pb-24">
          <div className="aspect-video rounded-xl shadow-2xl shadow-black/10 overflow-hidden">
            <HeroVideo src={videoSrc} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border">
            {/* Panel Library */}
            <div className="p-6 md:p-10 border-border md:border-r border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Upload className="size-5 text-muted-foreground" />
                  <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
                    {t("features.panelLibrary.title")}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t("features.panelLibrary.description")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelLibrary.detail1")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelLibrary.detail2")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelLibrary.detail3")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Creation */}
            <div className="p-6 md:p-10 border-border border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="size-5 text-muted-foreground" />
                  <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
                    {t("features.panelCreation.title")}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t("features.panelCreation.description")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelCreation.detail1")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Network className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelCreation.detail2")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelCreation.detail3")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Discussion */}
            <div className="p-6 md:p-10 border-border md:border-r">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="size-5 text-muted-foreground" />
                  <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
                    {t("features.panelDiscussion.title")}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t("features.panelDiscussion.description")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelDiscussion.detail1")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelDiscussion.detail2")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelDiscussion.detail3")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Research */}
            <div className="p-6 md:p-10 border-border">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="size-5 text-muted-foreground" />
                  <h3 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
                    {t("features.panelResearch.title")}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t("features.panelResearch.description")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelResearch.detail1")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelResearch.detail2")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">
                      {t("features.panelResearch.detail3")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Dimensions Section */}
      <section className="border-t border-border bg-muted/30 py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-foreground">
              {t("dimensions.title")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              {t("dimensions.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <DimensionCard
              icon={Users}
              title={t("dimensions.demographic.title")}
              description={t("dimensions.demographic.description")}
            />
            <DimensionCard
              icon={MapPin}
              title={t("dimensions.geographic.title")}
              description={t("dimensions.geographic.description")}
            />
            <DimensionCard
              icon={Brain}
              title={t("dimensions.psychological.title")}
              description={t("dimensions.psychological.description")}
            />
            <DimensionCard
              icon={ShoppingCart}
              title={t("dimensions.behavioral.title")}
              description={t("dimensions.behavioral.description")}
            />
            <DimensionCard
              icon={Lightbulb}
              title={t("dimensions.needs.title")}
              description={t("dimensions.needs.description")}
            />
            <DimensionCard
              icon={Smartphone}
              title={t("dimensions.tech.title")}
              description={t("dimensions.tech.description")}
            />
            <DimensionCard
              icon={Network}
              title={t("dimensions.social.title")}
              description={t("dimensions.social.description")}
            />
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="border-t border-border py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-foreground">
                {t("steps.title")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">{t("steps.description")}</p>
            </div>

            <div className="relative">
              <div
                className="absolute left-1/2 top-10 bottom-10 w-px bg-border hidden md:block"
                aria-hidden="true"
              />

              <div className="space-y-12 md:space-y-16">
                <StepItem
                  index={0}
                  title={t("steps.step1.title")}
                  description={t("steps.step1.description")}
                />
                <StepItem
                  index={1}
                  title={t("steps.step2.title")}
                  description={t("steps.step2.description")}
                />
                <StepItem
                  index={2}
                  title={t("steps.step3.title")}
                  description={t("steps.step3.description")}
                />
                <StepItem
                  index={3}
                  title={t("steps.step4.title")}
                  description={t("steps.step4.description")}
                />
                <StepItem
                  index={4}
                  title={t("steps.step5.title")}
                  description={t("steps.step5.description")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-20 md:py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-4xl font-normal tracking-tight text-foreground">
                {t("cta.title")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t("cta.description")}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
              <Button variant="primary" size="lg" className="w-full h-12" onClick={() => router.push("/panels")}>
                {t("cta.createFirst")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DimensionCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepItem({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex items-start md:items-center md:odd:flex-row-reverse group">
      <div
        className={
          "w-full md:w-1/2 pl-12 md:pl-0 " +
          "md:group-odd:text-left md:group-odd:pl-16 md:group-even:text-right md:group-even:pr-16"
        }
      >
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="absolute left-0 top-0 md:left-1/2 md:-translate-x-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-foreground text-background flex items-center justify-center font-mono font-medium text-xs md:text-sm border-2 md:border-4 border-background">
        {(index + 1).toString().padStart(2, "0")}
      </div>
    </div>
  );
}
