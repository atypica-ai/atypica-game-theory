"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BrainCircuitIcon,
  BuildingIcon,
  CodeIcon,
  HeadphonesIcon,
  LightbulbIcon,
  LucideIcon,
  MessageSquareIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback } from "react";
import { createHelloUserChatAction } from "../pricing/actions";

export function EnterpriseEN() {
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
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BuildingIcon className="size-4" />
            Enterprise Solution
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Complete AI-Powered User Research Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            For businesses operating at scale. Get the most comprehensive AI research solution with unlimited seats,
            50M monthly tokens, and dedicated support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={sayHelloToSales}>
              Contact Sales
            </Button>
            <Button size="lg" variant="outline" onClick={() => (window.location.href = "/pricing#organization")}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI-powered research tools to understand your users at scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* AI Research */}
            <ProductCard
              icon={BrainCircuitIcon}
              title="AI Research - Intelligent User Insight System"
              features={[
                {
                  title: "Research Process Automation",
                  description:
                    "Automate complete strategic research processes from problem definition to insight output, with visual tracking of research progress and workflow management",
                },
                {
                  title: "Research Methodology",
                  description:
                    "Enterprise edition equipped with advanced research models, providing deeper analytical frameworks and more rigorous reasoning logic",
                },
                {
                  title: "Executive Summary & Report",
                  description:
                    "Automatically generate structured, visualized professional strategic research reports",
                },
              ]}
            />

            {/* AI Interview */}
            <ProductCard
              icon={MessageSquareIcon}
              title="AI Interview - Intelligent User Interview System"
              features={[
                {
                  title: "Intelligent Interview Execution",
                  description:
                    "AI automatically generates interview questions or users set interview questions, conducting professional interviews with real users and AI personas",
                },
                {
                  title: "Interview Record Management",
                  description: "Automatically record, organize, and archive all interview content",
                },
                {
                  title: "Insight Extraction and Analysis",
                  description:
                    "Automatically extract key insights, pain points, and needs from interview content",
                },
              ]}
            />

            {/* AI Persona */}
            <ProductCard
              icon={UsersIcon}
              title="AI Persona - Intelligent User Profile Construction"
              features={[
                {
                  title: "Multi-dimensional Profile Generation",
                  description:
                    "Build multi-dimensional user profiles based on 7 dimensions including demographics, psychological characteristics, and behavioral patterns",
                },
                {
                  title: "Dynamic Profile Updates",
                  description:
                    "Updates and optimization of user profiles based on continuously collected interviewee feedback",
                },
                {
                  title: "Profile Visualization",
                  description: "Display user profile characteristics and attributes in an intuitive manner",
                },
                {
                  title: "Interactive Profile Dialogue",
                  description:
                    "Support real-time dialogue with AI-simulated user profiles to deeply explore their cognition, attitudes, and decision-making logic",
                },
              ]}
            />

            {/* AI Panel */}
            <ProductCard
              icon={UsersIcon}
              title="AI Panel - Intelligent User Groups"
              features={[
                {
                  title: "Enterprise Research Groups",
                  description:
                    "Flexibly assemble user groups from the public AI Persona library based on customer needs",
                },
                {
                  title: "Public Research Groups",
                  description:
                    "Pre-set user groups with common profiles by Atypica, ready to use out of the box",
                },
              ]}
            />
          </div>

          {/* AI Product R&D - Full width */}
          <Card className="not-dark:border-muted/40">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <LightbulbIcon className="size-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">AI Product R&D - AI Product Innovation</CardTitle>
                  <CardDescription>
                    Develop entirely new products from 0 to 1, identify market opportunities, design product concepts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Enterprise Advanced Features */}
      <section className="px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Advanced Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Additional capabilities designed specifically for enterprise needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Report Templates */}
            <FeatureCard
              icon={SparklesIcon}
              title="Enterprise Report Templates"
              description="Support enterprise users to customize AI Research report templates, including Logo, format, etc."
            />

            {/* Knowledge Base */}
            <FeatureCard
              icon={BrainCircuitIcon}
              title="Enterprise Knowledge Base"
              description="Support enterprise users to upload corporate background materials, product information, market data, strategic documents, and other background knowledge for research"
            />

            {/* API Interface */}
            <FeatureCard
              icon={CodeIcon}
              title="API Interface"
              description="Integrate AI Research capabilities directly into your own systems and workflows through our comprehensive API, enabling automated research processes and seamless data integration"
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dedicated support and customization services for enterprise success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Success Services */}
            <ServiceCard
              icon={HeadphonesIcon}
              title="Customer Success Services"
              description="Including technical support, monthly training, regular system maintenance"
              items={[
                {
                  title: "Technical Support",
                  details: [
                    "Response time: 8 hours per working day",
                    "Support channels: Email, WeChat, Phone",
                    "Support content: Function usage consultation and troubleshooting, technical issue investigation and resolution",
                  ],
                },
                {
                  title: "Training Services",
                  details: [
                    "Training frequency: 1 hour dedicated training per month",
                    "Training format: Online video conference/offline training (Shanghai)",
                    "Training content: New feature introduction and usage guidance, advanced features and tips sharing, industry best practice cases",
                  ],
                },
                {
                  title: "System Maintenance",
                  details: [
                    "Update frequency: Regular monthly updates",
                    "Maintenance content: Feature optimization and bug fixes, performance improvements and experience enhancements, new feature releases and upgrades, security patches and stability maintenance",
                  ],
                },
              ]}
            />

            {/* Enterprise Advanced Services */}
            <ServiceCard
              icon={SparklesIcon}
              title="Enterprise Advanced Services"
              description="Report template customization, AI Persona customization, AI Panel customization"
              items={[
                {
                  title: "Enterprise AI Research Report Template Customization",
                  details: [
                    "Customize dedicated report template services based on enterprise requirements",
                  ],
                },
                {
                  title: "Customized AI Persona",
                  details: [
                    "Customize enterprise user profile services based on enterprise needs",
                  ],
                },
                {
                  title: "Customized AI Panel",
                  details: [
                    "Customize dedicated user profile Panels based on specific enterprise needs, with each user group having no less than 50 people",
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Research?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contact our sales team to learn how atypica.AI Enterprise can help your organization
          </p>
          <Button size="lg" onClick={sayHelloToSales}>
            Contact Sales
          </Button>
        </div>
      </section>
    </div>
  );
}

// Product Card Component
function ProductCard({
  icon: Icon,
  title,
  features,
}: {
  icon: LucideIcon;
  title: string;
  features: { title: string; description: string }[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="size-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl mb-4">{title}</CardTitle>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="text-sm">
                  <div className="font-semibold mb-1">{feature.title}</div>
                  <div className="text-muted-foreground">{feature.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-3">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-xl mb-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

// Service Card Component
function ServiceCard({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: { title: string; details: string[] }[];
}) {
  return (
    <Card className="not-dark:border-muted/40">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border-l-2 border-primary/20 pl-4">
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <ul className="space-y-1">
                {item.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="text-sm text-muted-foreground">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
