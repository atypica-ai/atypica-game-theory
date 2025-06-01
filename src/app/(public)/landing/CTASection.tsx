"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  CrownIcon,
  GiftIcon,
  SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const plans = [
  {
    key: "starter",
    icon: GiftIcon,
    popular: false,
    color: "from-gray-500/10 to-gray-600/10",
    iconColor: "text-gray-600",
    borderColor: "border-gray-200/50",
  },
  {
    key: "professional",
    icon: SparklesIcon,
    popular: true,
    color: "from-primary/10 to-primary/20",
    iconColor: "text-primary",
    borderColor: "border-primary/30",
  },
  {
    key: "enterprise",
    icon: CrownIcon,
    popular: false,
    color: "from-purple-500/10 to-purple-600/10",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200/50",
  },
];

const getPlanName = (key: string) => {
  const names: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };
  return names[key] || key;
};

const getPlanPrice = (key: string) => {
  const prices: Record<string, string> = {
    starter: "Free",
    professional: "$49",
    enterprise: "Custom",
  };
  return prices[key] || key;
};

const getPlanPeriod = (key: string) => {
  const periods: Record<string, string> = {
    starter: "",
    professional: "/month",
    enterprise: "",
  };
  return periods[key] || "";
};

const getPlanDescription = (key: string) => {
  const descriptions: Record<string, string> = {
    starter: "Perfect for trying out AI research",
    professional: "For growing businesses and teams",
    enterprise: "For large organizations",
  };
  return descriptions[key] || key;
};

const getPlanFeature = (key: string, index: number) => {
  const features: Record<string, string[]> = {
    starter: [
      "3 research reports per month",
      "Basic AI analysis",
      "Standard report formats",
      "Email support",
    ],
    professional: [
      "Unlimited research reports",
      "Advanced AI analysis",
      "Custom report formats",
      "Priority support",
    ],
    enterprise: ["Custom AI models", "API access", "Dedicated support", "On-premise deployment"],
  };
  return features[key]?.[index - 1] || `Feature ${index}`;
};

const getPlanCTA = (key: string) => {
  const ctas: Record<string, string> = {
    starter: "Start Free",
    professional: "Start Trial",
    enterprise: "Contact Sales",
  };
  return ctas[key] || key;
};

export function CTASection() {
  const t = useTranslations();

  return (
    <div className="relative py-24 sm:py-32 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main CTA */}
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-20">
          <Badge variant="outline" className="mb-4">
            Get Started
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to revolutionize your research?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of businesses making smarter decisions with AI-powered research
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" className="h-12 px-8 font-medium" asChild>
              <Link href="/study">
                Start Free Research
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 font-medium" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>

        {/* Pricing preview */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? "scale-105 shadow-lg border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                    : "hover:border-primary/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
                )}

                <CardHeader className="text-center">
                  {plan.popular && (
                    <Badge className="absolute top-4 right-4 bg-primary">Most Popular</Badge>
                  )}

                  <div className={`mx-auto rounded-xl p-3 w-fit bg-gradient-to-br ${plan.color}`}>
                    <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                  </div>

                  <CardTitle className="text-xl">{getPlanName(plan.key)}</CardTitle>

                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{getPlanPrice(plan.key)}</span>
                    <span className="text-sm text-muted-foreground">{getPlanPeriod(plan.key)}</span>
                  </div>

                  <CardDescription>{getPlanDescription(plan.key)}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{getPlanFeature(plan.key, i)}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.key === "enterprise" ? "/contact" : "/pricing"}>
                      {getPlanCTA(plan.key)}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-6">
            Trusted by leading companies worldwide
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCardIcon className="h-4 w-4" />
              Secure payments
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckIcon className="h-4 w-4" />
              No long-term commitment
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SparklesIcon className="h-4 w-4" />
              Instant access
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center">
          <div className="mx-auto max-w-xl">
            <h3 className="text-lg font-semibold mb-2">
              Start your first research in under 60 seconds
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              No setup required. Just describe your research question and get comprehensive
              insights.
            </p>
            <Button size="lg" className="h-12 px-8 font-medium" asChild>
              <Link href="/study">
                Begin Research Now
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
