"use client";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function CTASection() {
  const t = useTranslations("HomePage.CTASection");

  return (
    <div className="hero-grid py-24 px-6">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight reveal-up">
          {t("title")}
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto reveal-up reveal-delay-1">
          {t("description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center reveal-up reveal-delay-2">
          <Button size="lg" className="btn-primary-enhanced" asChild>
            <Link href="/newstudy">
              {t("startButton")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/featured-studies">{t("examplesButton")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
