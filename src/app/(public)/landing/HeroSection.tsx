"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, SparklesIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function HeroSection() {
  const t = useTranslations();

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement badge */}
          <div className="mb-8 flex justify-center">
            <Badge
              variant="outline"
              className="gap-2 px-4 py-2 text-sm font-medium bg-background/50 backdrop-blur-sm border-primary/20"
            >
              <SparklesIcon className="h-4 w-4" />
              New: Advanced AI Research Engine
            </Badge>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            <span className="block">AI-Powered Research</span>
            <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              for Modern Business
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-3xl mx-auto">
            Generate comprehensive business research reports in minutes, not weeks. Our AI analyzes
            multiple perspectives to deliver insights that drive strategic decisions.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
            <Button size="lg" className="h-12 px-8 font-medium" asChild>
              <Link href="/study">
                Start Research
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 font-medium" asChild>
              <Link href="/featured-studies">View Examples</Link>
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-12">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <TrendingUpIcon className="h-6 w-6 text-primary" />
                10K+
              </div>
              <p className="text-sm text-muted-foreground">Research Reports Generated</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <UsersIcon className="h-6 w-6 text-primary" />
                500+
              </div>
              <p className="text-sm text-muted-foreground">Businesses Served</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <SparklesIcon className="h-6 w-6 text-primary" />
                95%
              </div>
              <p className="text-sm text-muted-foreground">Insight Accuracy Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
