import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    title: "加入",
    description: (
      <>
        <Link
          href="https://friends.atypica.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          注册
        </Link>
        联盟计划，获取专属推荐链接
      </>
    ),
  },
  {
    title: "推广",
    description: (
      <>
        分享您的专属链接，通过{" "}
        <Link
          href="https://friends.atypica.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          Tolt
        </Link>{" "}
        实时跟踪推广表现
      </>
    ),
  },
  {
    title: "赚取",
    description: "每位推荐用户前 3 个月的前 3 笔订单赚取 30% 佣金",
  },
];

export function AffiliateZH() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      {/* Hero Section */}
      <header className="text-center mb-20 md:mb-40">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight mb-6">
          通过推广 atypica.AI 赚取丰厚收益
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-8">
          推荐付费用户，前 3 个月的前 3 笔订单可获
          <span className="font-bold text-primary"> 30% </span>佣金
        </p>
        <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
          <Link href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer">
            加入联盟计划
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* How it Works Section */}
      <section className="mb-16 md:mb-20">
        <h2 className="text-3xl md:text-4xl font-EuclidCircularA font-medium mb-12 text-center">
          如何运作
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
          <Link href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer">
            加入联盟计划
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Help Section */}
      <section className="text-center">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4">有疑问？</h2>
        <p className="text-lg text-muted-foreground mb-8">与我们的 AI 智能体对话，即时获取解答</p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link href="/sage/profile/TbbLWdttgRyhqgvU" target="_blank" rel="noopener noreferrer">
            咨询专家
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
