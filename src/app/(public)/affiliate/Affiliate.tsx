import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AffiliateHeroGhosts } from "./AffiliateHeroGhosts";

export async function Affiliate() {
  const t = await getTranslations("AffiliatePage");

  const steps = [
    {
      title: t("howItWorks.steps.join.title"),
      description: (
        <>
          <Link
            href={t("links.affiliateProgram")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            {t("howItWorks.steps.join.linkText")}
          </Link>{" "}
          {t("howItWorks.steps.join.description")}
        </>
      ),
    },
    {
      title: t("howItWorks.steps.promote.title"),
      description: (
        <>
          {t("howItWorks.steps.promote.description")}{" "}
          <Link
            href={t("links.affiliateProgram")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
          >
            {t("howItWorks.steps.promote.linkText")}
          </Link>
          {t("howItWorks.steps.promote.descriptionSuffix") && (
            <> {t("howItWorks.steps.promote.descriptionSuffix")}</>
          )}
        </>
      ),
    },
    {
      title: t("howItWorks.steps.earn.title"),
      description: t("howItWorks.steps.earn.description"),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      {/* Hero Section */}
      <header className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-20 md:mb-40">
        {/* Left: Copy */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400">
            {t("hero.description")}
            <span className="font-bold border-b-2 border-primary"> {t("hero.commission")} </span>
            {t("hero.descriptionSuffix")}
          </p>
          <Button variant="primary" size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
            <Link href={t("links.affiliateProgram")} target="_blank" rel="noopener noreferrer">
              {t("hero.cta")}
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Right: Ghost conversation scene */}
        <div className="flex-1 w-full md:w-auto">
          <AffiliateHeroGhosts bubbleText={t("hero.bubbleText")} />
        </div>
      </header>

      {/* How it Works Section */}
      <section className="mb-16 md:mb-20">
        <h2 className="text-3xl md:text-4xl font-EuclidCircularA font-medium mb-12 text-center">
          {t("howItWorks.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="bg-muted p-6 rounded-2xl border hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-base mb-4 mx-auto ring-1 ring-border">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">{step.title}</h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-20 md:mb-40 text-center">
        <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
          <Link href={t("links.affiliateProgram")} target="_blank" rel="noopener noreferrer">
            {t("hero.cta")}
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Help Section */}
      <section className="text-center">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4">
          {t("help.title")}
        </h2>
        <p className="text-lg text-muted-foreground mb-8">{t("help.description")}</p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link href={t("links.sage")} target="_blank" rel="noopener noreferrer">
            {t("help.cta")}
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
