"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  ChevronRightIcon,
  CodeIcon,
  HeadphonesIcon,
  LightbulbIcon,
  LucideIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { createHelloUserChatAction } from "../pricing/actions";

export function EnterpriseEN() {
  const t = useTranslations("EnterprisePage");
  const sayHelloToSales = useCallback(async () => {
    const result = await createHelloUserChatAction({
      role: "user",
      content: "I want to learn about the enterprise plan",
    });
    if (!result.success) {
      throw result;
    }
    const chat = result.data;
    window.location.href = `/agents/hello/${chat.id}`;
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <ShieldCheckIcon className="size-4" />
            Enterprise Ready • SOC2 Compliant
          </div>
          <h1
            className={cn(
              "font-EuclidCircularA max-w-5xl mx-auto mb-6",
              "font-medium tracking-tight text-4xl md:text-6xl",
            )}
          >
            Scale Your Research <br />
            <span className="italic font-InstrumentSerif tracking-normal">
              with AI-Powered Insights
            </span>
          </h1>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 mb-12">
            Built for businesses operating at scale. Get unlimited seats, 50M monthly tokens, <br />
            and dedicated support to transform how your organization understands users.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="rounded-full h-12 has-[>svg]:px-6"
              onClick={sayHelloToSales}
            >
              Contact Sales
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full h-12"
              onClick={() => (window.location.href = "/pricing#organization")}
            >
              View Pricing
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">50M</div>
              <div className="text-sm text-muted-foreground">Tokens per month</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">∞</div>
              <div className="text-sm text-muted-foreground">Unlimited seats</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">8h</div>
              <div className="text-sm text-muted-foreground">Support response</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">API</div>
              <div className="text-sm text-muted-foreground">Full integration</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Products */}
      <section className="py-20 md:py-28 bg-muted/30 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase mb-4">
              Core Platform
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4">
              Complete Research Suite
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              Five integrated products to understand users at scale
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            {/* AI Research - Featured */}
            <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0">
                  <div className="p-4 rounded-xl bg-white/20">
                    <BrainCircuitIcon className="size-8" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">
                    AI Research - Intelligent User Insight System
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="font-semibold mb-2">Research Process Automation</div>
                      <div className="text-sm opacity-90">
                        Automate strategic research from problem definition to insight output, with
                        visual tracking
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">Advanced Methodology</div>
                      <div className="text-sm opacity-90">
                        Enterprise models providing deeper analytical frameworks and rigorous
                        reasoning
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">Executive Reports</div>
                      <div className="text-sm opacity-90">
                        Automatically generate structured, visualized professional strategic reports
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Products Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <ProductCard
                icon={MessageSquareIcon}
                title="AI Interview"
                subtitle="Intelligent User Interview System"
                features={[
                  "AI-generated professional interviews with users and personas",
                  "Automatic recording and organization",
                  "Insight extraction and analysis",
                ]}
              />

              <ProductCard
                icon={UsersIcon}
                title="AI Persona"
                subtitle="Intelligent User Profile Construction"
                features={[
                  "Multi-dimensional profiles across 7 dimensions",
                  "Dynamic updates from feedback",
                  "Interactive dialogue with AI personas",
                ]}
              />

              <ProductCard
                icon={UsersIcon}
                title="AI Panel"
                subtitle="Intelligent User Groups"
                features={[
                  "Flexible enterprise research groups",
                  "Pre-configured common user groups",
                  "Custom panel assembly",
                ]}
              />

              <ProductCard
                icon={LightbulbIcon}
                title="AI Product R&D"
                subtitle="AI Product Innovation"
                features={[
                  "0-to-1 product development",
                  "Market opportunity identification",
                  "Product concept design",
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 md:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase mb-4">
              Enterprise Capabilities
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4">
              Built for Your Organization
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              Additional features designed specifically for enterprise needs
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            <EnterpriseFeatureCard
              icon={SparklesIcon}
              title="Report Templates"
              description="Customize AI Research report templates with your brand, logo, and format"
              color="purple"
            />

            <EnterpriseFeatureCard
              icon={BrainCircuitIcon}
              title="Knowledge Base"
              description="Upload corporate materials, product info, market data for context-aware research"
              color="blue"
            />

            <EnterpriseFeatureCard
              icon={CodeIcon}
              title="API Integration"
              description="Integrate AI Research into your systems and workflows for automated processes"
              color="yellow"
            />

            <EnterpriseFeatureCard
              icon={ShieldCheckIcon}
              title="Security & Compliance"
              description="SOC 2 certified with enterprise-grade security and data protection"
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-20 md:py-32 bg-zinc-900 text-white overflow-hidden relative px-4">
        <div className="absolute inset-0 bg-[url('/_public/grid.svg')] opacity-10" />
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20">
                <ShieldCheckIcon className="size-4" />
                Enterprise Ready
              </div>
              <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
                Enterprise-Grade Security <br />
                <span className="text-zinc-400">SOC2 Certified</span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-xl">
                We prioritize your data security and privacy. Our platform is built on
                enterprise-grade infrastructure with rigorous compliance standards.
              </p>

              <div className="mt-12 p-6 md:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="flex items-start md:items-center gap-6">
                  <div className="shrink-0 p-4 rounded-xl bg-green-500/10 text-green-400 shadow-[0_0_20px_-5px_rgba(74,222,128,0.3)]">
                    <ShieldCheckIcon className="size-8 md:size-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">SOC2 Certified</h3>
                    <p className="text-zinc-400 text-sm md:text-base max-w-md">
                      Our platform is audited and certified to meet strict industry standards for
                      security and compliance.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 pl-4 lg:pl-0 lg:pr-4 border-l-2 border-zinc-800 lg:border-l-0 lg:border-l-transparent">
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                      Status
                    </span>
                    <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-sm font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Active & Monitored
                    </div>
                  </div>
                  <div className="hidden lg:block h-10 w-px bg-zinc-800"></div>
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">
                      Auditor
                    </span>
                    <span className="text-white font-medium">AICPA Accredited</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Services */}
      <section className="py-20 md:py-28 bg-muted/30 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase mb-4">
              Dedicated Support
            </p>
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-4">
              Enterprise Services
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              Professional support and customization for your success
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            {/* Customer Success */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border-2 border-amber-500/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                    <HeadphonesIcon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">Customer Success Services</h3>
                    <p className="text-sm text-muted-foreground">
                      Technical support, training, and maintenance
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 w-fit">
                  {t("paidValueAddedService")}
                </div>
              </div>

              <div className="space-y-4">
                <ServiceDetail
                  title="Technical Support"
                  items={[
                    "8-hour response time per working day",
                    "Email, WeChat, and phone support",
                    "Function consultation and troubleshooting",
                  ]}
                />
                <ServiceDetail
                  title="Training Services"
                  items={[
                    "1 hour dedicated training per month",
                    "Online/offline formats available",
                    "Feature guidance and best practices",
                  ]}
                />
                <ServiceDetail
                  title="System Maintenance"
                  items={[
                    "Regular monthly updates",
                    "Performance improvements",
                    "Security patches and stability",
                  ]}
                />
              </div>
            </div>

            {/* Advanced Services */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border-2 border-amber-500/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                    <SparklesIcon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">Enterprise Advanced Services</h3>
                    <p className="text-sm text-muted-foreground">
                      Custom solutions for your organization
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 w-fit">
                  {t("paidValueAddedService")}
                </div>
              </div>

              <div className="space-y-4">
                <ServiceDetail
                  title="Report Template Customization"
                  items={["Dedicated report templates based on your requirements"]}
                />
                <ServiceDetail
                  title="Custom AI Personas"
                  items={["Enterprise user profile services tailored to your needs"]}
                />
                <ServiceDetail
                  title="Custom AI Panels"
                  items={["Dedicated user groups with 50+ personas per panel"]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl mx-auto text-center bg-linear-to-br from-primary/10 to-primary/5 rounded-3xl p-12 md:p-16">
            <h2 className="font-EuclidCircularA font-medium text-3xl md:text-5xl mb-6">
              Ready to Transform Your Research?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Contact our sales team to learn how atypica.AI Enterprise can help your organization
              understand users at scale
            </p>
            <Button
              size="lg"
              className="rounded-full h-12 has-[>svg]:px-6"
              onClick={sayHelloToSales}
            >
              Contact Sales
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({
  icon: Icon,
  title,
  subtitle,
  features,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: string[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="size-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{title}</CardTitle>
            <CardDescription className="mb-4">{subtitle}</CardDescription>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Enterprise Feature Card Component
function EnterpriseFeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: "purple" | "blue" | "yellow" | "green";
}) {
  const colorClasses = {
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 text-center">
      <div className={cn("p-3 rounded-xl w-fit mx-auto mb-4", colorClasses[color])}>
        <Icon className="size-6" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Service Detail Component
function ServiceDetail({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-l-2 border-primary/20 pl-4">
      <h4 className="font-semibold mb-2 text-sm">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
